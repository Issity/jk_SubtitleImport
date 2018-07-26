/*
JK_SubtitleImport v0.1.0
Copyright 2018 Jakub Kowalski

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.

This script will import SRT and create keyframed text layer with the same
parameters as selected template layer.

*/

var SRTFile = File.openDialog("Select SRT file", "SRT Subtitles:*.srt,All files:*.*");
var SRTFileName = "";
var subNumber = 0;
var lineNumber = 0;
var templateSubLayer = null;
var newSubLayer = null;
var newSourceText = "";
var subtitleSegment = []; // [subID, InTime, OutTime, subtitleText]

if (SRTFile != null) {
  SRTFile.open("r");
  SRTFile.encoding = "UTF-8";
  SRTFileName = SRTFile.displayName;

  app.beginUndoGroup("JK_SubtitleImport");
  if (checkIfTextLayerIsSelected() != false) {
    templateSubLayer = checkIfTextLayerIsSelected();
    newSubLayer = templateSubLayer.duplicate();
    templateSubLayer.enabled = false;
    templateSubLayer.selected = false;
    newSubLayer.name = SRTFileName;
    newSourceText = newSubLayer.property("ADBE Text Properties").property("ADBE Text Document");
    removeAllKeyframesFromProperty(newSourceText);
    subtitleSegment = readNextSubFromFile(SRTFile);
    addSubtitleKeyframesToLayer(subtitleSegment, newSubLayer);
    // TODO enable new layer
    // TODO set empty subtitle at start
  }

  SRTFile.close();
  app.endUndoGroup();
}

/*
subtitleSegment ([Number, Number, Number, String]) - array with subID, InTime,
OutTime and subtitle text.
txtLayer (TextLayer)
Adds keyframes with subtitle text at specified time.
*/
function addSubtitleKeyframesToLayer (subtitleSegment, txtLayer) {
  var inIndex = 0;
  var outIndex = 0;
  var inTime = subtitleSegment[1];
  var outTime = subtitleSegment[2];
  var text = subtitleSegment[3];
  var sourceText = txtLayer.property("ADBE Text Properties").property("ADBE Text Document");
  // if (sourceText.numKeys != 0) {
  //   var nearestInKey = sourceText.nearestKeyIndex(inTime);
  //   var nearestOutKey = sourceText.nearestKeyIndex(outTime);
    // if (sourceText.keyTime(nearestInKey) == inTime) {
    //   inIndex = nearestInKey;
    // } else {
    //   inIndex = sourceText.addKey(inTime);
    // }
    // if (sourceText.keyTime(nearestOutKey) == outTime) {
    //   outIndex = nearestOutKey;
    // } else {
    //   outIndex = sourceText.addKey(outTime);
    // }
// }
  inIndex = sourceText.addKey(inTime);
  outIndex = sourceText.addKey(outTime);
  // var myTextDocument = sourceText.value;
  // myTextDocument.fontSize = 10;
  // myTextDocument.text = "foobar";
// myTextLayer.property("Source Text").setValue(myTextDocument);
// alert(myTextLayer.property("Source Text").value);
  sourceText.setValueAtKey(inIndex, text);
  // sourceText.setValueAtKey(outIndex, myTextDocument);
  sourceText.setValueAtKey(outIndex, "");
}

/*
layer (Layer)
comp (CompItem)
Sets layer's IN point to comp's start time.
*/
function setLayerInToCompStart(layer, comp) {
  layer.inPoint = comp.displayStartTime;
}

function setLayerOutToLastTextKeyframe(txtLayer) {
  var lastKeyIndex = txtLayer.property("ADBE Text Properties").property("ADBE Text Document").numKeys;
  if (lastKeyIndex != 0) {
    var lastKeyTime = txtLayer.property("ADBE Text Properties").property("ADBE Text Document").keyTime(lastKeyIndex);
    txtLayer.outPoint = lastKeyTime;
    return true;
  } else {
    return false;
  }
}

/*
comp (CompItem)
Checks if comp's start time is 0.
If it's not due to non-zero media start time, SRT won't be in sync. Unless it
matches media start time.
*/
function isCompStartAtZero(comp) {
  if (comp.displayStartTime == 0) {
    return true;
  } else {
    return false;
  }
}

function isSRTLongerThanComp(lastTimecode, comp) {
  //TODO
}

/*
layer (layer)
comp (CompItem)
Checks if layer ends beyond comp's work area.
*/
function isLayerLongerThanComp(layer, comp) {
  if (fixAEMath(layer.outPoint) > (fixAEMath(comp.workAreaStart + comp.workAreaDuration))) {
    return true;
  } else {
    return false;
  }
}

/*
SRTTimestamp (String)
Converts time stamps in SRT format - HH:MM:SS,mmm --> HH:MM:SS,mmm.
Returns [inTime, outTime] in seconds or null if conversion fails.
*/
function convertSRTTimestamp(SRTTimestamp) {
  var timeStamp = [];
  var inTime, outTime;
  SRTTimestamp = stripWhitespace(SRTTimestamp);
  if ((SRTTimestamp.length == 29) && (SRTTimestamp.substr(12, 5) == " --> ")) {
    inTime = SRTTimestamp.split(" --> ")[0];
    outTime = SRTTimestamp.split(" --> ")[1];
    timeStamp = [convertTimeCodeToSeconds(inTime), convertTimeCodeToSeconds(outTime)];
    if ((timeStamp[0] == null) || (timeStamp[1] == null)) {
      return null;
    } else {
      return timeStamp;
    }
  } else {
    alert("Incorrect timestamp.")
    return null;
  }
}

/*
timeCode (String)
Takes timecode in format HH:MM:SS,mmmm and converts to seconds.
Returns null if conversion fails.
*/
function convertTimeCodeToSeconds(timeCode) {
  var timeInSecs = null;
  try {
    if (timeCode.length != 12) throw "Invalid length.";
    var hours = parseInt(timeCode.substr(0, 2), 10);
    var minutes = parseInt(timeCode.substr(3, 2), 10);
    var seconds = parseInt(timeCode.substr(6, 2), 10);
    var msecs = parseInt(timeCode.substr(9, 3), 10);
    if (isNaN(hours) || isNaN(minutes) || isNaN(seconds) || isNaN(msecs)) {
      throw "Incorrect value.";
    }
    timeInSecs = hours * 60 * 60 + minutes * 60 + seconds + msecs / 1000;
  }
  catch(err) {
    alert("Incorrect timecode format.\n" + err, "convertTimeCodeToSeconds", true);
  }
  finally {
    return timeInSecs;
  }
}

function removeAllKeyframesFromProperty(property) {
  if (property.numKeys > 0) {
    for (i = property.numKeys; i > 0; i--) {
      property.removeKey(i);
    }
  }
}

function readNextSubFromFile(activeSRTFile) {
  //TODO Ignore empty lines before subID
  //TODO While not EOF
  var buffer = "";
  var subID = activeSRTFile.readln();
  var SRTTimestamp = activeSRTFile.readln();
  var timestamp = convertSRTTimestamp(SRTTimestamp);
  var subtitleLine;
  var subtitleText = "";
  var currentSubtitle = [];
  subtitleLine = activeSRTFile.readln();
  while ((subtitleLine != "") || activeSRTFile.eof) {
    subtitleText += (subtitleText == "") ? subtitleLine : "\n" + subtitleLine;
    subtitleLine = activeSRTFile.readln();
  }
  currentSubtitle = [subID, timestamp[0], timestamp[1], subtitleText];
  return currentSubtitle;
}

function checkIfTextLayerIsSelected() {
  var selectedLayers = app.project.activeItem.selectedLayers;
  if (selectedLayers.length < 1) {
    alert("Please select a text layer", "Error", true);
    return false;
  } else if (selectedLayers.length > 1) {
    alert("Multiple layers selected. Select a single text layer.", "Error", true);
    return false;
  }
  if (selectedLayers[0] instanceof TextLayer) {
    return selectedLayers[0];
  }
}

/*
str (String)
Removes any whitespace from the start and end of the string. Including empty
lines and new line symbol.
https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/trim
*/

function stripWhitespace(str) {
  return str.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, '');
}

/*
num (Number)
After Effects does some really weird math.
Two items (like layer OUT point and a keyframe) which are at seemingly the same
point in time, may return different time values. The difference is around 10th
decimal place. In most cases it doesn't matter, but can seriously break
comparisons when checking which of items is earlier in time.
These time values may appear
*/

function fixAEMath (num) {
  var precision = 100000; // probably 1000 would work just as good
  num = Math.round(num * precision) / precision;
  return num;
}
