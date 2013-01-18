/*
 * MusicJSON
 *  - A bi-directional converter between MusicXML and MusicJSON
 * https://github.com/saebekassebil/musicjson
 *
 * Copyright (c) 2012 Saebekassebil
 * Licensed under the MIT license.
 */

var xmldom   = require('flat-xmldom'),
    fs       = require('fs'),
    path     = require('path'),
    util     = require('util');

(function () {
  "use strict";

  // Node Types
  var NodeType = {};
  var ELEMENT_NODE                = NodeType.ELEMENT_NODE                = 1;
  var ATTRIBUTE_NODE              = NodeType.ATTRIBUTE_NODE              = 2;
  var TEXT_NODE                   = NodeType.TEXT_NODE                   = 3;
  var CDATA_SECTION_NODE          = NodeType.CDATA_SECTION_NODE          = 4;
  var ENTITY_REFERENCE_NODE       = NodeType.ENTITY_REFERENCE_NODE       = 5;
  var ENTITY_NODE                 = NodeType.ENTITY_NODE                 = 6;
  var PROCESSING_INSTRUCTION_NODE = NodeType.PROCESSING_INSTRUCTION_NODE = 7;
  var COMMENT_NODE                = NodeType.COMMENT_NODE                = 8;
  var DOCUMENT_NODE               = NodeType.DOCUMENT_NODE               = 9;
  var DOCUMENT_TYPE_NODE          = NodeType.DOCUMENT_TYPE_NODE          = 10;
  var DOCUMENT_FRAGMENT_NODE      = NodeType.DOCUMENT_FRAGMENT_NODE      = 11;
  var NOTATION_NODE               = NodeType.NOTATION_NODE               = 12;

  /*
   * Auxilliary Variables and Functions
   */
  var kPartWise = {
    id: '-//Recordare//DTD MusicXML 2.0 Partwise//EN',
    url: 'http://www.musicxml.org/dtds/partwise.dtd',
    type: 'score-partwise'
  };

  var metaData = {'part-group': {}},
      forceArrays = ['score-part', 'part-group', 'part', 'measure', 'attributes', 'note'];

  // Fix MusicXML to MusicJSON conversion issues
  function fixMusicJson(el, obj) {

    var nodeName = el.nodeName.toLowerCase();
    var i, length, child, name;

    // Fix node 'part-group': Add 'part-group' member information to 'score-part' nodes
    if (nodeName === 'part-list') {
      var groups = {};
      for (i = 0, length = el.childNodes.length; i < length; i++) {
        child = el.childNodes[i].$obj;
        name = el.childNodes[i].nodeName.toLowerCase();

        if (name === 'part-group' && child.$number !== undefined) {
          if (child.$type === 'start') {
            groups[child.$number] = true;
          }
          else if (child.$type === 'stop') {
            delete groups[child.$number];
          }
        }
        
        if (name === 'score-part') {
          for (var group in groups) {
            if (groups.hasOwnProperty(group)) {
              child['part-group'] = child['part-group'] || [];
              child['part-group'].push(group);
            }
          }
        }
      }
    }

    // Add 'note' position information to nodes 'direction'
    if (nodeName === 'measure') {
      var noteId = -1, lastDirection = null;
      for (i = 0, length = el.childNodes.length; i < length; i++) {
        child = el.childNodes[i].$obj;
        name = el.childNodes[i].nodeName.toLowerCase();

        if (name === 'note') {
          noteId++;

          if (lastDirection !== null) {
            lastDirection.noteAfter = noteId;
            lastDirection = null;
          }
        }
        else if (name === 'direction') {
          lastDirection = child;
          if (noteId >= 0) {
            child.noteBefore = noteId;
          }
        }
      }
    }

    // Unify: Force single objects into arrays
    for (child in obj) {
      if (obj.hasOwnProperty(child) && !util.isArray(obj[child]) && forceArrays.indexOf(child) !== -1) {
        obj[child] = [obj[child]];
      }
    }

    return obj;
  }

  // Parses a MusicXML tag
  function parseElement(el) {
    var obj = {}, i, length, attribute, child, childNodeName, backup, node;

    // Save attributes with '$' prefix
    if (el.attributes) {
      for (i = 0, length = el.attributes.length; i < length; i++) {
        attribute = el.attributes.item(i);
        obj['$' + attribute.name] = attribute.value;
      }
    }

    // Childs
    for (i = 0, length = el.childNodes.length; i < length; i++) {
      node = el.childNodes[i];

      if (node.nodeType === ELEMENT_NODE) {
        child = parseElement(node);
        childNodeName = node.nodeName.toLowerCase();

        if (childNodeName in obj && !util.isArray(obj[childNodeName])) {
          backup = obj[childNodeName];
          obj[childNodeName] = [backup, child];
        } else if (childNodeName in obj) {
          obj[childNodeName].push(child);
        } else {
          obj[childNodeName] = child;
        }
      } else if (node.nodeType === TEXT_NODE) {
        if (node.textContent && node.textContent.trim() !== '') {
          if (!el.attributes.length || el.attributes.length < 1) {
            obj = node.textContent;
          } else {
            obj.content = node.textContent;
          }
        }
      }
    }

    // Fast access to object for post-treatment
    el.$obj = obj;

    // Fix MusicXML to MusicJSON conversion issues
    obj = fixMusicJson(el, obj);

    return obj;
  }

  // Translates a MusicJSON element to MusicXML
  function toXML(doc, el, nodeName) {
    var xmlElement = doc.createElement(nodeName), x, length, i;

    if (typeof el === 'number' || typeof el === 'string') {
      xmlElement.appendChild(doc.createTextNode(el));
      return xmlElement;
    }

    for (i in el) {
      if (el.hasOwnProperty(i)) {
        if (i.charAt(0) === '$') { // Attribute
          xmlElement.setAttribute(i.substr(1), el[i]);
        } else { // Element
          if (util.isArray(el[i])) {
            for (x = 0, length = el[i].length; x < length; x++) {
              xmlElement.appendChild(toXML(doc, el[i][x], i));
            }
          } else {
            xmlElement.appendChild(toXML(doc, el[i], i));
          }
        }
      }
    }

    return xmlElement;
  }

  /*
   * Converts MusicXML to MusicJSON
   */
  exports.musicJSON = function (source, callback) {
    // Ugly way of creating an XML document from string
    var doc = new xmldom.DOMParser().parseFromString(source);

    // Fetch the "root" document from the html -> body -> firstChild
    var root = doc.childNodes[1];

    // Parse and convert the document
    var musicJSON = {};

    // Start the recursive serializing of the MusicXML document
    musicJSON[root.tagName.toLowerCase()] = parseElement(root);

    callback(null, musicJSON);
  };

  /*
   * Converts MusicJSON to MusicXML
   */
  exports.musicXML = function (source, callback) {
    var part = kPartWise, musicXML, impl, type, xmlHeader;

    // Create the DOM implementation
    impl = new xmldom.DOMImplementation();

    // Create the DOCTYPE
    type = impl.createDocumentType(part.type, part.id, part.url);

    // Create the document itself
    musicXML = impl.createDocument('', '', null);

    // Create the <?xml ... ?> header
    xmlHeader = musicXML.createProcessingInstruction('xml',
        'version="1.0" encoding="UTF-8" standalone="no"');

    // Append both the header and the DOCTYPE
    musicXML.appendChild(xmlHeader);
    musicXML.appendChild(type);

    // Start serializing the MusicJSON document
    musicXML.appendChild(toXML(musicXML, source[part.type], part.type));

    callback(null, new xmldom.XMLSerializer().serializeToString(musicXML));
  };

}).call(this);
