# node-cgen-castxml

Using [castxml](https://github.com/CastXML/CastXML) to generate function definitions

To prepare the typescript environment, you should install tsd:
```
npm install tsd -g
```

You need to restore the typescript definitions from tsd.json:
```
tsd install
```

You need to restore the npm packages:
```
npm install
```

Download castxml from https://midas3.kitware.com/midas/folder/13152

execute castxml
```
castxml --castxml-gccxml -o out.xml  file.h -x c++ -I includefolder
```
for windows/visual studio w/exceptions:
```
castxml --castxml-gccxml -o out.xml  file.h -x c++ -I includefolder -fms-compatibility-version=19.00 -fexceptions
```

Which will output something similar to:
```
...
 <Method id="_16614" name="select_on_container_copy_construction" returns="_4483" context="_4483" access="public" location="f97:827" file="f97" line="827" const="1" inline="1" mangled="?select_on_container_copy_construction@?$_Wrap_alloc@V?$allocator@_S@std@@@std@@QEBA?AU12@U_Nil@2@@Z">
    <Argument type="_5952" location="f97:827" file="f97" line="827" default="std::_Nil()"/>
  </Method>
  <Struct id="_16615" name="rebind&lt;char16_t&gt;" context="_4483" access="public" location="f97:833" file="f97" line="833" members="_29628 _30361 _30362 _30363 _30364 _30365" size="8" align="8"/>
  <Method id="_16616" name="address" returns="_16602" context="_4483" access="public" location="f97:840" file="f97" line="840" const="1" inline="1" mangled="?address@?$_Wrap_alloc@V?$allocator@_S@std@@@std@@QEBAPEA_SAEA_S@Z">
    <Argument name="_Val" type="_16606" location="f97:840" file="f97" line="840"/>
  </Method>
...
```

Using parser:
```
node parser.js --help

  Usage: parser [options]

  Options:

    -h, --help           output usage information
    -V, --version        output the version number
    --dumpxml            dumps the xml source
    --dumpjson           dumps the json created from xml
    --dumprebuilt        dumps the rebuilt object with hierarchy
    --dumpreconstructed  dumps the reconstructed functions
    --dumpfiles          dumps the files section
    -m, --module <path>  filter by module file path
```

Example:
```
node parser.js opencv.xml --dumpreconstructed -m ..\opencv.module
```

will output something similar to:
```
...
Mat cvarrToMat ( CvArr const * arr,  bool copyData,  bool allowND,  int coiMode,  AutoBuffer<double, 136> * buf);
Mat cvarrToMatND ( CvArr const * arr,  bool copyData,  int coiMode);
void extractImageCOI ( CvArr const * arr,  OutputArray coiimg,  int coi);
void insertImageCOI ( InputArray coiimg,  CvArr * arr,  int coi);
schar seqPush ( CvSeq * seq,  void const * element);
schar seqPushFront ( CvSeq * seq,  void const * element);
void seqPop ( CvSeq * seq,  void * element);
void seqPopFront ( CvSeq * seq,  void * element);
void seqPopMulti ( CvSeq * seq,  void * elements,  int count,  int in_front);
...
```


