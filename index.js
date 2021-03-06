#! /usr/bin/env node

/************************************************************************
 *
 *  page2svg
 *
 *  Reads an HTML5 file from stdin that contains math
 *  and writes a new HTML5 document to stdout that
 *  contains SVG versions of the math instead.
 *
 * ----------------------------------------------------------------------
 *
 *  Copyright (c) 2014 The MathJax Consortium
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

var mjAPI = require("./lib/ahapage.js");
var fs = require('fs');
var jsdom = require('jsdom').jsdom;

var argv = require("yargs")
  .strict()
  .usage("Usage: page2svg [options] < input.html > output.html",{
    preview: {
      boolean: true,
      describe: "make SVG into a Mathjax preview"
    },
    speech: {
      boolean: true,
      describe: "include speech text"
    },
    speechrules: {
      default: "mathspeak",
      describe: "ruleset to use for speech text (chromevox or mathspeak)"
    },
    speechstyle: {
      default: "default",
      describe: "style to use for speech text (default, brief, sbrief)"
    },
    linebreaks: {
      boolean: true,
      describe: "perform automatic line-breaking"
    },
    nodollars: {
      boolean: true,
      describe: "don't use single-dollar delimiters"
    },
    nofontcache: {
      boolean: true,
      describe: "don't use <defs> and <use> tags for fonts"
    },
    localcache: {
      boolean: true,
      describe: "cache fonts for each equation separately"
    },
    format: {
      default: "AsciiMath,TeX,MathML",
      describe: "input format(s) to look for"
    },
    eqno: {
      default: "none",
      describe: "equation number style (none, AMS, or all)"
    },
    img: {
       default: "",
       describe: "make external svg images with this name prefix"
    },
    font: {
      default: "TeX",
      describe: "web font to use"
    },
    ex: {
      default: 6,
      describe: "ex-size in pixels"
    },
    width: {
      default: 100,
      describe: "width of container in ex"
    },
    extensions: {
      default: "",
      describe: "extra MathJax extensions e.g. 'Safe,TeX/noUndefined'"
    }
  })
  .argv;

argv.format = argv.format.split(/ *, */);
if (argv.font === "STIX") argv.font = "STIX-Web";
mjAPI.config({MathJax: {SVG: {font: argv.font}}, extensions: argv.extensions});


var retryFlag;
// retryFlag = setInterval(function () {
//     if(mjAPI.)
// }, 100);
mjAPI.start();

//
//  Process an HTML file:
//
function processHTML(html,callback) {
  var document = jsdom(html,{features:{FetchExternalResources: false}});
  var xmlns = getXMLNS(document);
  mjAPI.typeset({
    html: document.body.innerHTML,
    renderer: (argv.img == "" ? "SVG" : "IMG"),
    inputs: argv.format,
    equationNumbers: argv.eqno,
    singleDollars: !argv.nodollars,
    useFontCache: !argv.nofontcache,
    useGlobalCache: !argv.localcache,
    addPreview: argv.preview,
    speakText: argv.speech,
    speakRuleset: argv.speechrules.replace(/^chromevox$/i,"default"),
    speakStyle: argv.speechstyle,
    ex: argv.ex, width: argv.width,
    linebreaks: argv.linebreaks,
    xmlns:xmlns
  }, function (result) {
    document.body.innerHTML = result.html;
    document.head.appendChild(document.body.firstChild);
    
    
    //remove mathjax javascript files
    var script = document.getElementsByTagName('script');
    for(var i = 0 ;i<script.length; i++){
        if((script[i].src && script[i].src.indexOf('MathJax')!= -1) || (script[i].type && script[i].type== 'text/x-mathjax-config')){
            script[i].parentNode.removeChild(script[i]);
        }
    }
    
    if (argv.img !== "") {
      var img = document.getElementsByClassName("MathJax_SVG_IMG");
      for (var i = 0, m = img.length; i < m; i++) {
        var N = (i+1).toString(); while (N.length < 4) {N = "0"+N}
        var file = argv.img+N+".svg";
        var svg = [
          '<?xml version="1.0" standalone="no"?>',
          '<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">',
          new Buffer(img[i].src.replace(/^.*?,/,""),"base64").toString("utf-8")
        ].join("\n");
        fs.writeFileSync(file,svg);
        img[i].src = file;
      }
    }
    var HTML = "<!DOCTYPE html>\n"+document.documentElement.outerHTML.replace(/^(\n|\s)*/,"");
    callback(HTML);
  });
}

//
//  Look up the MathML namespace from the <html> attributes
//
function getXMLNS(document) {
  var html = document.head.parentNode;
  for (var i = 0, m = html.attributes.length; i < m; i++) {
    var attr = html.attributes[i];
    if (attr.nodeName.substr(0,6) === "xmlns:" &&
        attr.nodeValue === "http://www.w3.org/1998/Math/MathML")
             {return attr.nodeName.substr(6)}
  }
  return "mml";
}


module.exports = function (data, callback) {
    processHTML(data, function (html) {
        callback(html)
    })
}