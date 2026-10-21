// Included by the Qt host translation unit. Captures the actual composed GL
// framebuffer, after WebKit, and publishes it only after a successful swap.
#include "screen_native.h"
#include <QtGui/QImage>
#include <QtCore/QBuffer>
#include <QtCore/QFile>
#include <QtCore/QDir>
#include <QtCore/QDateTime>
static unsigned long screenSequence,screenFrame;
static int screenWait,screenState,screenWidth,screenHeight;
static qint64 screenTime;
static QByteArray screenImage,screenJSON,screenPath;
static const char *screenError="";
extern "C" void oma_screen_clear(void){screenImage.clear();screenJSON.clear();screenState=0;screenWait=0;}
extern "C" unsigned long oma_screen_request(void){
 if(!screenSequence){QDir dir("data");QStringList old=dir.entryList(QStringList("agent-screen-*.png"),QDir::Files);for(int i=0;i<old.size();i++)dir.remove(old[i]);}
 oma_screen_clear();++screenSequence;screenError="";
 if(!oma_host_active()){screenState=-1;screenError="OmaBerry is not foreground";}else{screenState=1;screenWait=3;}
 return screenSequence;
}
extern "C" void oma_screen_render(int width,int height,unsigned long frame){
 if(screenState!=1||--screenWait>0)return;
 if(width<1||height<1||width>1024||height>1024){screenState=-1;screenError="Capture size invalid";return;}
 QByteArray rgba(width*height*4,0);while(glGetError()!=GL_NO_ERROR){}
 glReadPixels(0,0,width,height,GL_RGBA,GL_UNSIGNED_BYTE,rgba.data());
 if(glGetError()!=GL_NO_ERROR){screenState=-1;screenError="Framebuffer read failed";return;}
 QImage image(width,height,QImage::Format_RGB888);
 if(image.isNull()){screenState=-1;screenError="Capture allocation failed";return;}
 for(int y=0;y<height;y++){unsigned char *out=image.scanLine(y);const unsigned char *in=reinterpret_cast<const unsigned char *>(rgba.constData())+(height-y-1)*width*4;for(int x=0;x<width;x++){out[x*3]=in[x*4];out[x*3+1]=in[x*4+1];out[x*3+2]=in[x*4+2];}}
 QByteArray png;QBuffer buffer(&png);buffer.open(QIODevice::WriteOnly);
 if(!image.save(&buffer,"PNG")||png.size()>2*1024*1024){screenState=-1;screenError="PNG encode failed or exceeded 2 MiB";return;}
 QFile file("data/agent-screen.tmp");
 if(!file.open(QIODevice::WriteOnly)||file.write(png)!=png.size()){screenState=-1;screenError="Capture file write failed";return;}
 file.close();
 screenPath="data/agent-screen-"+QByteArray::number(qulonglong(screenSequence))+".png";
 if(std::rename("data/agent-screen.tmp",screenPath.constData())!=0){screenState=-1;screenError="Capture file rename failed";return;}
 if(screenSequence>2)QFile::remove("data/agent-screen-"+QString::number(qulonglong(screenSequence-2))+".png");
 screenImage=png.toBase64();screenWidth=width;screenHeight=height;screenFrame=frame;screenTime=QDateTime::currentMSecsSinceEpoch();screenState=2;
}
extern "C" void oma_screen_present(int success){if(screenState==2){screenState=success?3:-1;if(!success){screenError="Frame presentation failed";screenImage.clear();}}}
extern "C" const char *oma_screen_poll(void){
 if(!oma_host_active()&&screenState>0){screenState=-1;screenError="OmaBerry is not foreground";screenImage.clear();}
 screenJSON="{\"id\":"+QByteArray::number(qulonglong(screenSequence))+",\"state\":\""+(screenState==3?"done":screenState<0?"error":screenState?"pending":"idle")+"\"";
 if(screenState==3)screenJSON+=",\"frame\":"+QByteArray::number(qulonglong(screenFrame))+",\"capturedAt\":"+QByteArray::number(screenTime)+",\"width\":"+QByteArray::number(screenWidth)+",\"height\":"+QByteArray::number(screenHeight)+",\"path\":\""+screenPath+"\",\"dataUrl\":\"data:image/png;base64,"+screenImage+"\"";
 if(screenState<0)screenJSON+=",\"error\":\""+QByteArray(screenError)+"\"";
 screenJSON+="}";return screenJSON.constData();
}
