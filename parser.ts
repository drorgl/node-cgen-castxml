/// <reference path="typings/tsd.d.ts" />

import fs = require('fs');
import xml2js = require('xml2js');
import util = require('util');

import program = require('commander');
 
module cgen {

    export var parser = new xml2js.Parser({ mergeAttrs: true });

    var singleValueKeys: Array<string> = ['id', 'name', 'returns', 'location', 'file', 'line', 'extern', 'artificial', 'mangled', 'static', 'inline', 'context', 'type', 'access', 'size', 'align', 'members', 'version', 'cvs_revision', 'init', 'const'];

    function isArray(o: any): boolean {
        return Object.prototype.toString.call(o) === '[object Array]';
    }

    function isAnyObject(value: any): boolean {
        return value != null && (typeof value === 'object' || typeof value === 'function');
    }

    interface castxml_base {
        elementtype: string;
        file?: string;
    }

    interface castxml_file extends castxml_base{
        id: string;
        name: string;
    }

    interface IMap<K,T> {
        [Key: K]: T;
    }

    interface IMapFilter<K,T> {
        (key : K, value: T): boolean;
    }

    function FilterMap<K, T>(map: IMap<K, T>, predicate: IMapFilter<K, T>): IMap<K, T> {
        var retval: IMap<K, T> = {};
        for (var key in map) {
            if (predicate(key, map[key])) {
                retval[key] = map[key];
            }
        }
        return retval;
    }

    export class castxmlcgen {
        //all files in castxml data
        private _allFiles: IMap<string, castxml_file> = {};

        //all the module files
        private _moduleFiles: IMap<string, castxml_file> = {};

        //a map of all the objects in castxml data
        private _allObjects: IMap<string, castxml_base> = {};

        //map of only the objects in the module files
        private _moduleObjects: IMap<string, castxml_base> = {};
        
        //get all objects with id into objects map
        public ExtractObjects(data: any, parenttype: string, objects : IMap<string,castxml_base>) {
            if (isArray(data)) {
                for (var i = 0; i < data.length; i++) {
                    this.ExtractObjects(data[i], parenttype, objects);
                }
            } else if (isAnyObject(data)) {

                for (var key in data) {
                    if (key == "id") {
                        objects[data[key]] = data;
                        data.elementtype = parenttype;
                    } else {
                        this.ExtractObjects(data[key], parenttype,objects);
                    }
                }
            }
        }

        //attach children objects instead of the undescored (_) members.
        public RebuilChildren(data: any, removeNonExisting: boolean, tracker: IMap<string, boolean>) {
            if (isArray(data)) {
                for (var i = 0; i < data.length; i++) {
                    this.RebuilChildren(data[i],removeNonExisting,tracker);
                }
            } else if (isAnyObject(data)) {
                if (data.id){
                    if (tracker[data.id]) {
                        return;
                    } else {
                        tracker[data.id] = true;
                    }
                }

                for (var key in data) {
                    var datavalue = data[key];
                    if (key != "id" && typeof datavalue === "string") {
                        var values = datavalue.split(' ');
                        var children = [];
                        for (var i = 0; i < values.length; i++) {
                            var value = values[i];
                            if (value != "" && value.substring(0, 1) == "_") {
                                //if removing, only remove from module, if not removing, get from all objects
                                var childobj = (removeNonExisting) ? this._moduleObjects[value] : this._allObjects[value];
                                if (childobj == null) {
                                    if (!removeNonExisting) {
                                        children.push(value);
                                    }
                                } else {
                                    children.push(childobj);
                                }
                            }
                        }
				
                        if (children.length == 1) {
                            data[key] = children[0];
                        } else if (children.length > 1) {
                            data[key] = children;
                        }

                    } else {
                        this.RebuilChildren(data[key],removeNonExisting,tracker);
                    }
                }
            }
        }


        //iterate over all data objects, removing unnecessary arrays from keys in singleValueKeys
        private IterateDataReassignArrays(data: any) {
            if (isArray(data)) {
                for (var i = 0; i < data.length; i++) {
                    this.IterateDataReassignArrays(data[i]);
                }
            } else if (isAnyObject(data)) {

                for (var key in data) {
                    if (singleValueKeys.indexOf(key) != -1) {
                        data[key] = data[key].join(" ");
                    } else {
                        this.IterateDataReassignArrays(data[key]);
                    }
                }
            }
        }

        //iterates over all files section in castxml data
        private IterateFiles(data: any): IMap<string, castxml_file> {
            var files: IMap<string, castxml_file> = {};
            for (var i = 0; i < data.File.length; i++) {
                var file: castxml_file = data.File[i];
                files[file.id] = file;
                file.elementtype = "File";
            }
            return files;
        }

        

        public RebuildObject(data: any, modulePath : string) {
            //remove all extra arrays, make them a single value
            this.IterateDataReassignArrays(data);

            //iterate all files, build a dictionary
            this._allFiles = this.IterateFiles(data.GCC_XML);

            //filter files by this module only.
            this._moduleFiles = FilterMap<string, castxml_file>(this._allFiles, (k, t) => (t.name.indexOf(modulePath) === 0));

            //get all objects in castxml data
            for (var key in data.GCC_XML) {
                this.ExtractObjects(data.GCC_XML[key], key, this._allObjects );
            }

            //filter objects to module only
            this._moduleObjects = FilterMap<string, castxml_base>(this._allObjects, (k, t) => (t.file == null || this._moduleFiles[t.file] != null));

            var tracker: IMap<string, boolean> = {};
            this.RebuilChildren(data.GCC_XML.Namespace, true,tracker);
            this.RebuilChildren(data, false,tracker);
            
            ////console.log(util.inspect(filtered, false, 4));
        }
    }

/*
{ GCC_XML: 
       { version: '0.9.0',
         cvs_revision: '1.136',
         Namespace: [Object],
         Typedef: [Object],
         Class: [Object],
         Function: [Object],
         Variable: [Object],
         Struct: [Object],
         Union: [Object],
         CvQualifiedType: [Object],
         OperatorFunction: [Object],
         Enumeration: [Object],
         FundamentalType: [Object],
         Method: [Object],
         OperatorMethod: [Object],
         Destructor: [Object],
         Field: [Object],
         PointerType: [Object],
         Unimplemented: [Object],
         Constructor: [Object],
         ArrayType: [Object],
         ReferenceType: [Object],
         Converter: [Object],
         FunctionType: [Object],
         File: [Object] } }
    */


}

module cgendumper {

    //get tab 
    function tablevel(level) {
        var retval = "";
        for (var i = 0; i < level; i++) {
            retval += "\t";
        }
        return retval;
    }

    //retrieve the type name by parsing the type hierarchy (ReferenceType/PointerType/CvQualifiedType)
    function getTypeName(data) {
        var retval = "";

        if (data.elementtype == "CvQualifiedType") {
            if (data.const == "1") {
                retval += " const";
            }
            if (data.volatile == "1") { //??? not sure it exists!
                retval += " volatile";
            }
        }

        if (data.elementtype == "ReferenceType") {
            retval += " &";
        }

        if (data.elementtype == "PointerType") {
            retval += " *";
        }

        if (data.name) {
            retval += " " + data.name;
        } else {
            retval = getTypeName(data.type) + retval;
        }
        return retval;
    }

    //gets arguments - e.g. <Type> <Argument Name>
    function getArguments(data) {
        var retval = "";
        if (data.Argument) {
            for (var i = 0; i < data.Argument.length; i++) {
                var argument = data.Argument[i];

                retval += getTypeName(argument.type);

                retval += " " + argument.name;
                if (i < (data.Argument.length - 1)) {
                    retval += ", ";
                }
            }
        }

        return retval;
    }

    //get function definition
    function getFunction(data) {
        var retval = "";
        if (data.returns != null) {
            if (data.returns.name) {
                retval += data.returns.name + " ";
            } else {
                retval += data.returns.type.name + " ";
                //retval += (util.inspect(data.returns, false, 2));
            }
        } else {
            retval += "void ";
        }

        retval += data.name + " (";
        retval += getArguments(data);
        retval += ");";

        return retval;
    }

    //get class member definition
    function getMember(data) {
        if (data.access != "public") {
            return "";
        }


        var retval = "";
        retval += data.access + " ";
        if (data.static == "1") {
            retval += "static ";
        }
        retval += data.name;

        retval += "(";

        retval += getArguments(data);

        retval += ");";

        return retval;
    }

    //get class definition
    function getClass(level : number, data) {
        var retval = "";
        if (data.elementtype == "Class") {
            retval += "class ";
        }
        if (data.elementtype == "Struct") {
            retval += "struct ";
        }

        retval += data.name;

        retval += "{\r\n";
        level++;

        if (data.members) {
            for (var i = 0; i < data.members.length; i++) {
                var member = data.members[i];

                if (member.elementtype == "Method" || member.elementtype == "Constructor") {
                    retval +=tablevel(level) + getMember(member) + "\r\n";
                }


                if (member.elementtype == "OperatorMethod") {
                    //TODO: not implemented
                }

                if (member.elementtype == "Field") {
                    //TODO: not implemented, should implement only public fields
                }



            }
        }
        level--;

        retval += tablevel(level) +  "};\r\n";

        return retval;
    }

    //get enumeration definition
    function getEnumeration(level: number, data) {
        var retval = "";
        retval += "enum ";
        if (data.name) {
            retval += data.name;
        }

        retval += "{\r\n";

        level++;
        if (data.EnumValue) {
            for (var i = 0; i < data.EnumValue.length; i++) {
                retval += tablevel(level) + data.EnumValue[i].name;
                if (i < (data.EnumValue.length - 1)) {
                    retval += ",";
                }
                retval += "\r\n";
            }
        }
        level--;

        retval += tablevel(level) + "}\r\n";

        return retval;
    }

    export function dumpMembers(level, data) {
        level++;
        //classes
        if (data.members) {
            for (var c = 0; c < data.members.length; c++) {
                var member = data.members[c];
                if (member.elementtype == "Function") {
                    try {
                        console.log(tablevel(level) + getFunction(member));
                    } catch (e) {
                        //only thing that fails is function callbacks, fix later
                        console.log(e);
                        //console.log(tablevel(level) + util.inspect(member, false, 5))
                    }
                } else if (member.elementtype == "Class" || member.elementtype == "Struct") {
                    if (member.incomplete == "1") { 
                        //TODO? abstract class!
                    
                    } else {
                        console.log(tablevel(level) + getClass(level, member));
                    }
                } else if (member.elementtype == "Enumeration") {//"Enumeration"
                    console.log(tablevel(level) + getEnumeration(level, member));
                } else if (false) {//"Field"
                } else if (member.elementtype == "Unimplemented") {
                    //console.log(tablevel(level) + "Unimplemented");
                } else {//if (member.elementType == "Namespace"){
                    dumpMembers(level, member);
                }
            }
        }

        level--;
    }


    export function dump(data) {
        console.log("dumping");
        var level = 0;
        for (var i = 0; i < data.Namespace.length; i++) {
            var namespace = data.Namespace[i];
            console.log(namespace.name);

            level++;
            
            dumpMembers(level, namespace);

            level--;
        }


    }

}

interface parser_options {
    dumpxml?: boolean;
    dumpjson?: boolean;
    dumprebuilt?: boolean;
    dumpreconstructed?: boolean;
    dumpfiles?: boolean;
    module?: string;
    sourceFiles?: string[];
}


var opts: parser_options = {};


program
    .version("0.0.1")
    .option("--dumpxml", "dumps the xml source", (a1, a2) => { opts.dumpxml = true; },false)
    .option("--dumpjson", "dumps the json created from xml",(a1, a2) => { opts.dumpjson= true; }, false)
    .option("--dumprebuilt", "dumps the rebuilt object with hierarchy", (a1, a2) => { opts.dumprebuilt = true; }, false)
    .option("--dumpreconstructed", "dumps the reconstructed functions", (a1, a2) => { opts.dumpreconstructed = true; }, false)
    .option("--dumpfiles", "dumps the files section", (a1, a2) => { opts.dumpfiles = true; }, false)
    .option("-m, --module <path>", "filter by module file path", (a1, a2) => { opts.module = a1; }, false)
    .parse(process.argv);

//console.log(opts);

opts.sourceFiles = program.args;

console.log(opts);



//function usage() : void {
//    console.log("usage: parser.js --dumpxml --dumpjson -dumprebuilt --dumpreconstructed <input-file>");
//    process.exit(1);
//}

//if (process.argv.length < 3) {
//    usage();
//}


//var args = process.argv.slice(1);
//for (var i in args) {
//    var a = args[i];
//    if (a == '--dumpxml') {
//        opts.dumpxml = true;
//    } else if (a == "--dumpjson") {
//        opts.dumpjson = true;
//    } else if (a == "--dumprebuilt") {
//        opts.dumprebuilt = true;
//    } else if (a == "--dumpreconstructed") {
//        opts.dumpreconstructed = true;
//    } else if (a == "--dumpfiles") {
//        opts.dumpfiles = true;
//    } else {
//        opts.ccfile = a;
//    }
//}

//if (!('ccfile' in opts)) {
//    usage();
//}

for (var i = 0; i < opts.sourceFiles.length; i++) {
    var file = opts.sourceFiles[i];

    fs.readFile(file, (err, data) => {
        if (err != null) {
            console.log("error reading xml file", err);
            return;
        }
        if (opts.dumpxml) {
            console.log(data.toString());
        } else if (opts.dumpjson) {
            cgen.parser.parseString(data.toString(), function (err, result) {
                console.log(util.inspect(result, false, 4));
            });
        } else if (opts.dumprebuilt) {
            cgen.parser.parseString(data.toString(), function (err, result) {
                var cgp = new cgen.castxmlcgen();

                cgp.RebuildObject(result, opts.module);

                console.log(util.inspect(result.GCC_XML, false, 4));
            });
        } else if (opts.dumpreconstructed) {
            cgen.parser.parseString(data.toString(), function (err, result) {

                var cgp = new cgen.castxmlcgen();

                cgp.RebuildObject(result, opts.module);

                cgendumper.dump(result.GCC_XML);

            });
        } else if (opts.dumpfiles) {
            cgen.parser.parseString(data.toString(), function (err, result) {
                var cgp = new cgen.castxmlcgen();

                console.log(util.inspect(result.GCC_XML.Files, false, 4));
            });
        }

    });

}