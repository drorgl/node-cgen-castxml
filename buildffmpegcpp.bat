castxml\bin\castxml.exe --castxml-gccxml -o ffmpegcpp.xml  "..\ffmpegcpp.module\ffmpegcpp\src\ffmpeg.cpp" -x c++ -I ..\ffmpegcpp.module\ffmpegcpp\includes -I D:\Projects\_Modules\ffmpeg.module\ffmpeg_src -I ..\ffmpeg.module\config\win\x64 -I ..\ffmpeg.module -fms-compatibility-version=19.00 -fexceptions

node parser.js ffmpegcpp.xml --dumpreconstructed -m ..\ffmpegcpp.module

