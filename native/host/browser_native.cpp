// Native web content is composited into PocketJS tiles; no HTML draws the desktop.
#include "browser_native.h"
#include <bb/cascades/Application>
#include <bb/cascades/WebPage>
#include <bb/cascades/WebSettings>
#include <bb/cascades/WebPageTexture>
#include <bb/cascades/WebPageCompositor>
#include <bb/cascades/WebPageEventHandler>
#include <bb/cascades/WebLoadRequest>
#include <bb/cascades/Event>
#include <bb/AbstractBpsEventHandler>
#include <QtCore/QCoreApplication>
#include <QtCore/QEventLoop>
#include <QtCore/QByteArray>
#include <QtCore/QVariant>
#include <bps/navigator.h>
#include <sys/keycodes.h>
#include <bps/screen.h>
#include <EGL/egl.h>
#include <GLES2/gl2.h>
#include <algorithm>
#include <cstring>
#include <cstdio>
using namespace bb::cascades;
class Browser : public QObject {
 Q_OBJECT
public:
 WebPage *page;WebPageCompositor *compositor;WebPageEventHandler *input;WebPageTexture *texture;
 int x,y,w,h,inputRequest,inputAccepted;bool visible,ready,dirty,pending,keyboard;float px,py;QString error;
 Browser():x(0),y(0),w(320),h(240),inputRequest(-1),inputAccepted(0),visible(false),ready(false),dirty(true),pending(false),keyboard(false),px(20),py(20){
  page=new WebPage(this);page->settings()->setDevicePixelRatio(1.0);page->settings()->setTextAutosizingEnabled(false);compositor=new WebPageCompositor(this);input=new WebPageEventHandler(this);texture=new WebPageTexture(QSize(w,h),this);
  connect(compositor,SIGNAL(connectionSucceeded()),this,SLOT(connected()));
  connect(compositor,SIGNAL(repaintRequested()),this,SLOT(repaint()));
  connect(compositor,SIGNAL(scrollRequested(float,float)),this,SLOT(scrollTo(float,float)));
  connect(compositor,SIGNAL(zoomRequested(float,float,double)),this,SLOT(zoomTo(float,float,double)));
  connect(texture,SIGNAL(textureChanged()),this,SLOT(painted()));
  connect(input,SIGNAL(connectionSucceeded()),this,SLOT(inputConnected()));
  connect(input,SIGNAL(eventHandled(bb::cascades::Event*)),this,SLOT(handled(bb::cascades::Event*)));
  connect(page,SIGNAL(loadingChanged(bb::cascades::WebLoadRequest*)),this,SLOT(loading(bb::cascades::WebLoadRequest*)));
  connect(page,SIGNAL(javaScriptResult(int,QVariant)),this,SLOT(scriptResult(int,QVariant)));
  connect(page,SIGNAL(initialized(QString)),this,SLOT(pageReady(QString)));
 }
 void mouse(int down,int sx,int sy){if(!ready)return;QRectF r=compositor->viewableArea();input->handleEvent(input->createMouseEvent(down?SCREEN_LEFT_MOUSE_BUTTON:0,int(r.x()+px*r.width()/w),int(r.y()+py*r.height()/h),sx,sy,0,0));}
 // The standalone compositor has no Cascades TextInput control to commit IMF
 // text. Commit text into the focused DOM editor in an isolated world. Web
 // content never receives the PocketJS globals or a native command bridge.
 void text(const QString &value){QString escaped;for(int i=0;i<value.length();i++)escaped+=QString("\\u%1").arg(value.at(i).unicode(),4,16,QChar('0'));inputAccepted=0;inputRequest=page->evaluateJavaScript(QString::fromUtf8(R"JS(
(function(text){var d=document,e=d.activeElement;
 try{while(e&&e.tagName==='IFRAME'){d=e.contentDocument;e=d.activeElement;}}catch(ignore){return false;}
 if(!e||e.disabled||e.readOnly)return false;
 var editable=e.isContentEditable||e.tagName==='TEXTAREA'||(e.tagName==='INPUT'&&/^(text|search|email|url|tel|password|number)$/i.test(e.type));
 if(!editable)return false;
 var ok=true;for(var i=0;i<text.length;i++){var c=text.charAt(i);if(c==='\b')ok=d.execCommand('delete',false,null)&&ok;
 else if(c==='\r'||c==='\n'){if(e.tagName==='TEXTAREA'||e.isContentEditable)ok=d.execCommand('insertText',false,'\n')&&ok;else if(e.form){var ev=d.createEvent('Event');ev.initEvent('submit',true,true);if(e.form.dispatchEvent(ev))e.form.submit();}}
 else {var start=i;while(i+1<text.length&&!/[\b\r\n]/.test(text.charAt(i+1)))i++;ok=d.execCommand('insertText',false,text.slice(start,i+1))&&ok;}}
 return ok;
})("%1")
)JS").arg(escaped),JavaScriptWorld::Isolated);}
public Q_SLOTS:
 void scriptResult(int id,const QVariant &value){if(id==inputRequest){inputAccepted=value.toBool()?1:-1;if(inputAccepted<0)error="Tap a text field before typing";else error.clear();}}
 void inputConnected(){input->setKeyboardFocus(false);input->setKeyboardFocus(keyboard);}
 void pageReady(const QString &id){compositor->connectToWebPage(id);input->connectToWebPage(id);}
 // Standalone WebPage retains a device-wide CSS root even when its visual
 // viewport is resized. Constrain only the document root to the tile width.
 void flow(){page->evaluateJavaScript(QString("(function(){if(!document.documentElement)return;document.documentElement.style.setProperty('width','%1px','important');var e=document.createEvent('Event');e.initEvent('resize',false,false);window.dispatchEvent(e);})()").arg(w),JavaScriptWorld::Isolated);}
 void viewport(){if(!ready)return;compositor->setViewportSize(QSize(w,h));compositor->resetViewableArea();flow();dirty=true;}

 void connected(){ready=true;viewport();}

 void repaint(){dirty=true;}
 void painted(){pending=false;}
 void scrollTo(float x,float y){compositor->scrollToPoint(x,y);dirty=true;}
 void zoomTo(float x,float y,double scale){compositor->zoomToPoint(x,y,scale);dirty=true;}
 void handled(bb::cascades::Event *event){delete event;}
 void loading(bb::cascades::WebLoadRequest *request){if(request->status()==WebLoadStatus::Failed)error="Page failed to load";else error.clear();if(request->status()==WebLoadStatus::Succeeded)flow();}
};
static Browser *pages[16];static int focused=-1,touchOwner=-1,requestedFocus=-1;static int touchY;static bool touchDragged;
static int qtArgc;static char **qtArgv;
static bb::cascades::Application *application;static GLuint program;static QByteArray result;
class Events : public bb::AbstractBpsEventHandler {
 void (*callback)(bps_event_t *);
public: explicit Events(void (*fn)(bps_event_t *)):callback(fn){subscribe(screen_get_domain());subscribe(navigator_get_domain());}
 void event(bps_event_t *event){callback(event);}
};
static Events *eventBridge;
static Browser *get(int id){return id>=0&&id<16?pages[id]:0;}
extern "C" void oma_browser_init(int argc,char **argv,void (*events)(bps_event_t *)){
 qtArgc=argc;qtArgv=argv;application=new bb::cascades::Application(qtArgc,qtArgv);eventBridge=new Events(events);
}
extern "C" void oma_browser_pump(int wait){if(application)application->processEvents(wait?QEventLoop::WaitForMoreEvents:QEventLoop::AllEvents,5);}
extern "C" int oma_browser_open(int id){if(id<0||id>=16||!application)return 0;if(pages[id])return 1;int n=0;for(int i=0;i<16;i++)if(pages[i])n++;if(n>=4)return 0;pages[id]=new Browser;return 1;}
extern "C" void oma_browser_focus(int id){if(id==focused)return;if(get(focused)){pages[focused]->keyboard=false;pages[focused]->input->setKeyboardFocus(false);}focused=get(id)&&pages[id]->visible?id:-1;if(get(focused)){pages[focused]->keyboard=true;pages[focused]->input->setKeyboardFocus(true);}}
extern "C" void oma_browser_close(int id){Browser *b=get(id);if(!b)return;if(focused==id)oma_browser_focus(-1);if(touchOwner==id)touchOwner=-1;delete b;pages[id]=0;}
extern "C" void oma_browser_shutdown(){for(int i=0;i<16;i++)oma_browser_close(i);delete eventBridge;eventBridge=0;/* Application owns platform services until process exit. */}
extern "C" void oma_browser_load(int id,const char *url){Browser *b=get(id);if(!b)return;QUrl address(QString::fromUtf8(url));QString scheme=address.scheme().toLower();if(scheme!="https"&&scheme!="http"&&scheme!="file"&&QString::fromUtf8(url)!="about:blank"){b->error="Unsupported URL";return;}b->error.clear();b->inputRequest=-1;b->inputAccepted=0;b->page->setUrl(address);b->dirty=true;}
extern "C" void oma_browser_layout(int id,int x,int y,int w,int h,int visible){Browser *b=get(id);if(!b)return;if(!visible){b->visible=false;if(focused==id)oma_browser_focus(-1);return;}b->x=std::max(0,x*2);b->y=std::max(0,y*2);w=std::max(1,std::min(720,w*2));h=std::max(1,std::min(720,h*2));if(b->w!=w||b->h!=h){b->w=w;b->h=h;b->texture->setSize(QSize(w,h));b->viewport();b->dirty=true;}b->visible=visible!=0;if(!b->visible&&focused==id)oma_browser_focus(-1);}
extern "C" void oma_browser_action(int id,const char *name){Browser *b=get(id);if(!b)return;if(!strcmp(name,"back"))b->page->goBack();else if(!strcmp(name,"forward"))b->page->goForward();else if(!strcmp(name,"reload"))b->page->reload();else if(!strcmp(name,"stop"))b->page->stop();}
extern "C" void oma_browser_scroll(int id,int dy){Browser *b=get(id);if(!b||!b->ready)return;QRectF r=b->compositor->viewableArea();b->compositor->scrollToPoint(r.x(),std::max(0.0f,std::min(float(b->compositor->contentSize().height())-r.height(),r.y()+dy)));b->dirty=true;}
extern "C" const char *oma_browser_string(int id,int field){Browser *b=get(id);if(!b)return 0;result=(field==0?b->page->url().toString():field==1?b->page->title():b->error).toUtf8();return result.constData();}
extern "C" int oma_browser_take_focus(void){int id=requestedFocus;requestedFocus=-1;return id;}
extern "C" int oma_browser_loading(int id){Browser *b=get(id);return b&&b->page->loading();}
extern "C" int oma_browser_dimension(int id,int field){Browser *b=get(id);return !b?-1:field==0?b->w:field==1?b->h:field==2?b->ready:b->inputAccepted;}
extern "C" int oma_browser_click(int id,int x,int y){Browser *b=get(id);if(!b||!b->visible||!b->ready||x<0||y<0||x>=b->w||y>=b->h)return 0;oma_browser_focus(id);b->px=x;b->py=y;b->mouse(1,b->x+x,b->y+y);b->mouse(0,b->x+x,b->y+y);return 1;}
extern "C" int oma_browser_text(int id,const char *text){Browser *b=get(id);if(!b||!b->visible||!b->ready)return 0;QString value=QString::fromUtf8(text);if(value.length()>1024)return 0;oma_browser_focus(id);b->text(value);return 1;}
extern "C" int oma_browser_key(screen_event_t event){Browser *b=get(focused);if(!b||!b->visible)return 0;int scan=0,sym=0,cap=0,flags=0,mods=0;screen_get_event_property_iv(event,SCREEN_PROPERTY_KEY_SCAN,&scan);screen_get_event_property_iv(event,SCREEN_PROPERTY_KEY_SYM,&sym);screen_get_event_property_iv(event,SCREEN_PROPERTY_KEY_CAP,&cap);screen_get_event_property_iv(event,SCREEN_PROPERTY_KEY_FLAGS,&flags);screen_get_event_property_iv(event,SCREEN_PROPERTY_KEY_MODIFIERS,&mods);if(!(mods&KEYMOD_CTRL)&&((sym>=32&&sym<=0x10ffff&&sym<0xf000)||sym==KEYCODE_RETURN||sym==KEYCODE_BACKSPACE)){
 if(flags&(SCREEN_FLAG_KEY_DOWN|SCREEN_FLAG_KEY_REPEAT)){uint cp=sym==KEYCODE_RETURN?'\n':sym==KEYCODE_BACKSPACE?'\b':uint(sym);b->text(QString::fromUcs4(&cp,1));}return 1;}
 int sequence=0;long long timestamp=0;screen_get_event_property_iv(event,SCREEN_PROPERTY_SEQUENCE_ID,&sequence);screen_get_event_property_llv(event,SCREEN_PROPERTY_TIMESTAMP,&timestamp);b->input->handleEvent(b->input->createKeyEvent(scan,sym,cap,flags,mods,sequence,timestamp));return 1;}
extern "C" int oma_browser_pointer(int dx,int dy,int down){Browser *b=get(focused);if(!b||!b->visible)return 0;b->px=std::max(0.0f,std::min(float(b->w-1),b->px+dx*3));b->py=std::max(0.0f,std::min(float(b->h-1),b->py+dy*3));b->mouse(down,b->x+int(b->px),b->y+int(b->py));return 1;}
extern "C" int oma_browser_touch(screen_event_t event,int type){int xy[2]={0,0};screen_get_event_property_iv(event,SCREEN_PROPERTY_SOURCE_POSITION,xy);if(type==SCREEN_EVENT_MTOUCH_TOUCH){touchOwner=-1;for(int id=0;id<16;id++){Browser *b=get(id);if(b&&b->visible&&xy[0]>=b->x&&xy[0]<b->x+b->w&&xy[1]>=b->y&&xy[1]<b->y+b->h){touchOwner=id;requestedFocus=id;touchY=xy[1];touchDragged=false;oma_browser_focus(id);break;}}}Browser *b=get(touchOwner);if(!b)return 0;if(type==SCREEN_EVENT_MTOUCH_MOVE&&abs(xy[1]-touchY)>8){oma_browser_scroll(touchOwner,touchY-xy[1]);touchY=xy[1];touchDragged=true;}if(type==SCREEN_EVENT_MTOUCH_RELEASE){if(!touchDragged){b->px=xy[0]-b->x;b->py=xy[1]-b->y;b->mouse(1,xy[0],xy[1]);b->mouse(0,xy[0],xy[1]);}touchOwner=-1;}return 1;}
static GLuint shader(GLenum type,const char *source){GLuint s=glCreateShader(type);glShaderSource(s,1,&source,0);glCompileShader(s);return s;}
extern "C" void oma_browser_render(int width,int height){
 GLint framebuffer=0;glGetIntegerv(GL_FRAMEBUFFER_BINDING,&framebuffer);
 EGLDisplay display=eglGetCurrentDisplay();EGLContext context=eglGetCurrentContext();EGLSurface surface=eglGetCurrentSurface(EGL_DRAW);
 for(int i=0;i<16;i++){Browser *b=get(i);if(!b||!b->visible||!b->ready)continue;if(b->dirty&&!b->pending){b->dirty=false;b->pending=true;b->compositor->renderToTexture(b->texture,true);}}
 eglMakeCurrent(display,surface,surface,context);
 glBindFramebuffer(GL_FRAMEBUFFER,0);glViewport(0,0,width,height);
 if(!program){GLuint v=shader(GL_VERTEX_SHADER,"attribute vec2 p;attribute vec2 uv;varying vec2 t;void main(){gl_Position=vec4(p,0.,1.);t=uv;}");GLuint f=shader(GL_FRAGMENT_SHADER,"precision mediump float;varying vec2 t;uniform sampler2D image;void main(){gl_FragColor=texture2D(image,t);}");program=glCreateProgram();glAttachShader(program,v);glAttachShader(program,f);glBindAttribLocation(program,0,"p");glBindAttribLocation(program,1,"uv");glLinkProgram(program);glDeleteShader(v);glDeleteShader(f);}
 glUseProgram(program);glDisable(GL_BLEND);glDisable(GL_DEPTH_TEST);glDisable(GL_CULL_FACE);glEnable(GL_SCISSOR_TEST);glBindBuffer(GL_ARRAY_BUFFER,0);glActiveTexture(GL_TEXTURE0);glUniform1i(glGetUniformLocation(program,"image"),0);
 for(int i=0;i<16;i++){Browser *b=get(i);if(!b||!b->visible||!b->ready)continue;GLuint texture=b->texture->textureId();if(!texture)continue;float l=float(b->x)*2/width-1,r=float(b->x+b->w)*2/width-1,t=1-float(b->y)*2/height,bot=1-float(b->y+b->h)*2/height;GLfloat vertices[]={l,t,0,1,l,bot,0,0,r,t,1,1,r,bot,1,0};glScissor(b->x,height-b->y-b->h,b->w,b->h);glBindTexture(GL_TEXTURE_2D,texture);glEnableVertexAttribArray(0);glEnableVertexAttribArray(1);glVertexAttribPointer(0,2,GL_FLOAT,GL_FALSE,4*sizeof(float),vertices);glVertexAttribPointer(1,2,GL_FLOAT,GL_FALSE,4*sizeof(float),vertices+2);glDrawArrays(GL_TRIANGLE_STRIP,0,4);if(i==focused){glScissor(b->x+int(b->px),height-b->y-int(b->py)-6,4,6);glClearColor(.6f,.8f,.4f,1);glClear(GL_COLOR_BUFFER_BIT);}}
 glDisableVertexAttribArray(0);glDisableVertexAttribArray(1);glDisable(GL_SCISSOR_TEST);glBindFramebuffer(GL_FRAMEBUFFER,framebuffer);
}
#include "screen_native_impl.h"
#include <browser_native.moc>
