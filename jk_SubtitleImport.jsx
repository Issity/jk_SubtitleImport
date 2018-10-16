/*
JK_SubtitleImport v0.1.1
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

var SRTFile = null;
var SRTFileName = "";
var templateSubLayer = null;
var newSubLayer = null;
// var newSourceText = "";
var subtitleSegment = []; // [subID, InTime, OutTime, subtitleText, numberOfLines, completeSegment, reachedEOF] // redundant?
var allSubtitles = [];
var subsTotal = 0;
var fps = 0;
var extendOrNot = null; // 0 - don't extend; 1 - extend
var warnIfSubsLonger = null
var textLeading = 0;
var SettingsSectionName = "JK_SubtitleImport";

function readSettings() {
  if (app.settings.haveSetting(SettingsSectionName, "Align")) {
    dropAlign.selection = app.settings.getSetting(SettingsSectionName, "Align");
  }
  else {
    dropAlign.selection = 1;
  }

  if (app.settings.haveSetting(SettingsSectionName, "Rounding")) {
    dropRounding.selection = app.settings.getSetting(SettingsSectionName, "Rounding");
  }
  else {
    dropRounding.selection = 2;
  }

  if (app.settings.haveSetting(SettingsSectionName, "Extend")) {
    dropExtend.selection = app.settings.getSetting(SettingsSectionName, "Extend");
  }
  else {
    dropExtend.selection = 0;
  }

  if (app.settings.haveSetting(SettingsSectionName, "ExtendWarn")) {
    if (app.settings.getSetting(SettingsSectionName, "ExtendWarn") == "false") {
      checkWarnExtend.value = false;
    }
    else {
      checkWarnExtend.value = true;
    }
  }
  else {
    checkWarnExtend.value = true;
  }
}

function saveSettings() {
  app.settings.saveSetting(SettingsSectionName, "Align", dropAlign.selection.index);
  app.settings.saveSetting(SettingsSectionName, "Rounding", dropRounding.selection.index);
  app.settings.saveSetting(SettingsSectionName, "Extend", dropExtend.selection.index);
  app.settings.saveSetting(SettingsSectionName, "ExtendWarn", checkWarnExtend.value);
}

var w = (this instanceof Panel) ? this : new Window('palette {alignChildren: "fill"}');
  w.grpAlign = w.add("group");
    w.grpAlign.orientation = "column";
    w.grpAlign.add("statictext", undefined, "Alignment", {characters: 20, justify: "right"});
    var dropAlign = w.grpAlign.add("dropdownlist", undefined, ["Top", "Middle", "Bottom"]);
    // dropAlign.selection = 1;
  w.sep1 = w.add("panel");
  w.grpRounding = w.add("group");
  w.grpRounding.orientation = "column";
    w.grpRounding.add('statictext {text: "Keyframe rounding"}');
    var dropRounding = w.grpRounding.add("dropdownlist", undefined, ["Round up", "Round down", "Round math", "No rounding"]);
    // dropRounding.selection = 2;
  w.sep2 = w.add("panel");
  w.grpExtend = w.add("group");
  w.grpExtend.orientation = "column";
    w.grpExtend.add('statictext {text: "Extend timeline"}');
    var dropExtend = w.grpExtend.add("dropdownlist", undefined, ["Don't extend", "Extend till last keyframe"]);
    // dropExtend.selection = 0;
  w.sep3 = w.add("panel");
  w.grpWarnExtend = w.add("group");
  w.grpWarnExtend.orientation = "column";
    // w.grpWarnExtend.add('statictext {text: "Warn if subs are longer"}');
    var checkWarnExtend = w.grpWarnExtend.add("checkbox", undefined, "\u00A0Warn if subs are longer");
  w.grpButtons = w.add("group");
    w.grpButtons.butGo = w.add("button", undefined, "Go!");
//  w.grpStatus = w.add("group");

  // w.grpButtons.butGo.onClick = dropAlert;
  readSettings();
  if (w instanceof Window) {
      w.show();
  } else {
    w.layout.layout(true)
  }

w.grpButtons.butGo.onClick = main;

checkWarnExtend.onClick = function () {
  warnIfSubsLonger = checkWarnExtend.value;
  saveSettings();
}
checkWarnExtend.onClick(); // force assign initial value

dropExtend.onChange = function () {
  extendOrNot = dropExtend.selection.index;
  saveSettings();
}
dropExtend.onChange(); // force assign initial value

dropAlign.onChange = function () {
  saveSettings();
}

function main() {
  var i = 0;
  allSubtitles = [];
  subsTotal = 0;

  SRTFile = File.openDialog("Select SRT file", "SRT Subtitles:*.srt,All files:*.*");
  if (SRTFile != null) {
    SRTFile.open("r");
    SRTFile.encoding = "UTF-8";
    SRTFileName = SRTFile.displayName;

    app.beginUndoGroup("JK_SubtitleImport");
    if (checkIfTextLayerIsSelected() != false) { // TODO invoke checkIfTextLayerIsSelected only once
      templateSubLayer = checkIfTextLayerIsSelected();
      fps = templateSubLayer.containingComp.frameRate;
      newSubLayer = duplicateAndResetLayer(templateSubLayer, SRTFileName);
      // newSourceText = newSubLayer.property("ADBE Text Properties").property("ADBE Text Document"); // redundant?
      textLeading = Math.round(newSubLayer.property("ADBE Text Properties").property("ADBE Text Document").value.leading);
      textLeading = textLeading * dropAlign.selection.index / 2; // not very elegant shortcut
      // Depending on alignment option, leading is multiplied by 0, 0.5 or 1

      do {
        allSubtitles[subsTotal] = readNextSubFromFile(SRTFile);
        subsTotal++;
      } while ((allSubtitles[subsTotal - 1][5]) && !(allSubtitles[subsTotal - 1][6]));
      // repeat as long as complete segment can be read and we didn't reach EOF
      addSubtitlesToLayer(allSubtitles, newSubLayer, textLeading);
      newSubLayer.enabled = true;
      setLayerOutToLastTextKeyframe(newSubLayer);
      if (warnIfSubsLonger && isLayerLongerThanComp(newSubLayer)) {
        alert("Subtitles are longer than comp!");
      }
      if (extendOrNot == 1) {
        setCompEnd(newSubLayer);
      }
    }
    SRTFile.close();
    app.endUndoGroup();
  }
}

/*
templateLayer (TextLayer) - reference Text Layer to be used as subtitle template
newName (String) - name for a new layer
Duplicates the template layer, hides it, and removes anchor and source text
keyframes from the new one.
*/
function duplicateAndResetLayer(templateLayer, newName) {
  var newLayer = templateLayer.duplicate();
  newLayer.moveToBeginning();
  templateLayer.enabled = false;
  templateLayer.selected = false;
  newLayer.name = newName;
  removeAllKeyframesFromProperty(newLayer.property("ADBE Text Properties").property("ADBE Text Document"));
  removeAllKeyframesFromProperty(newLayer.property("ADBE Transform Group").property("ADBE Anchor Point"));
  addEmptyKeyframeAtStart(newLayer);
  newLayer.property("ADBE Transform Group").property("ADBE Anchor Point").addKey(0);
  newLayer.property("ADBE Transform Group").property("ADBE Anchor Point").setInterpolationTypeAtKey(1, KeyframeInterpolationType.HOLD);
  newLayer.property("ADBE Transform Group").property("ADBE Anchor Point").setValueAtKey(1, [0, 0]);
  return newLayer;
}

/*
time (Number) - time in seconds
fps (Number) - comp's framerate
Aligns keyframe time to exact frame. Prevent keyframes between frames.
Function is dynamically re-assigned depending on type of reounding selected.
*/
var roundToNearestFrame = function (){};

dropRounding.onChange = function () {
  switch (dropRounding.selection.index) {
    case 0:
      roundToNearestFrame = roundToNearestFrameUp;
    break;
    case 1:
      roundToNearestFrame = roundToNearestFrameDown;
    break;
    case 2:
      roundToNearestFrame = roundToNearestFrameMath;
    break;
    case 3:
      roundToNearestFrame = roundToNearestFrameNone;
    break;
    default:
      alert("Wrong rounding option!");
  }
  saveSettings();
}

dropRounding.onChange(); // force assign initial function
// TODO init all such functions in one block

function roundToNearestFrameMath(time, fps) {
  return (Math.round(time * fps) / fps);
}

function roundToNearestFrameUp(time, fps) {
  return (Math.ceil(time * fps) / fps);
}

function roundToNearestFrameDown(time, fps) {
  return (Math.floor(time * fps) / fps);
}

function roundToNearestFrameNone(time, fps) {
  return time;
}

/*
txtLayer (TextLayer)
Writes keyframe with no text at layer start. Otherwise some text might apppear
before the first keyframe.
*/
function addEmptyKeyframeAtStart(txtLayer) {
  var sourceText = txtLayer.property("ADBE Text Properties").property("ADBE Text Document");
  sourceText.setValueAtTime(0, "");
}

/*
subtitles (array of subtitleSegment)
txtLayer (TextLayer)
leading (Number)

Adding keyframes one by one is slower with each new keyframe. Much faster
solution is to add all keyframes at once using setValuesAtTimes.
http://omino.com/pixelblog/2009/08/04/ae-scripting-notes/
*/
function addSubtitlesToLayer(subtitles, txtLayer, leading) {
  var i = 0;
  var arrTextTimes = [];
  var arrText = [];
  var arrAnchorTimes = [0];
  var arrAnchor = [[0, 0]];
  var sourceText = txtLayer.property("ADBE Text Properties").property("ADBE Text Document");
  var anchorPoint = txtLayer.property("ADBE Transform Group").property("ADBE Anchor Point");
  var roundedIN = 0; // rounded IN time, saved so it's not calculated twice
  var anchorValue = [0, 0];
  var totalAnchors = 1; // index of last Anchor keyframe
  for (i = 0; i < subsTotal; i++) {
    roundedIN = roundToNearestFrame(subtitles[i][1], fps);
    arrTextTimes[i * 2] = roundedIN;
    arrText[i * 2] = subtitles[i][3];
    arrTextTimes[i * 2 + 1] = roundToNearestFrame(subtitles[i][2], fps);
    arrText[i * 2 + 1] = "";
    anchorValue = [0, (subtitles[i][4] - 1) * leading];
    if (arrAnchor[totalAnchors - 1][1] != anchorValue[1]) {
      totalAnchors = arrAnchorTimes.push(roundedIN);
      arrAnchor.push(anchorValue);
    }
  }
  sourceText.setValuesAtTimes(arrTextTimes, arrText);
  anchorPoint.setValuesAtTimes(arrAnchorTimes, arrAnchor);
}

/*
layer (Layer)
comp (CompItem)
Sets layer's IN point to comp's start time.
// TODO Is it needed at all?
// TODO Can comp be replaced with layer.containingComp?
*/
function setLayerInToCompStart(layer, comp) {
  layer.inPoint = comp.displayStartTime;
}

/*
txtLayer (TextLayer) - subtitle layer to use as duration reference
Extends comp, so it's at least as long as subtitles.
*/
function setCompEnd(txtLayer) {
  var comp = txtLayer.containingComp;
  var lastKeyIndex = txtLayer.property("ADBE Text Properties").property("ADBE Text Document").numKeys;
  if (lastKeyIndex != 0) {
    var lastKeyTime = txtLayer.property("ADBE Text Properties").property("ADBE Text Document").keyTime(lastKeyIndex);
    if (comp.duration < lastKeyTime) comp.duration = lastKeyTime - comp.workAreaStart;
    return true;
  } else {
    return false;
  }
}

/*
txtLayer (TextLayer) - subtitle layer
Aligns layer out to the last Source Text keyframe
*/
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

/*
layer (layer)
comp (CompItem)
Checks if layer ends beyond comp's work area.
*/
function isLayerLongerThanComp(layer) {
  var comp = layer.containingComp;
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

/*
activeSRTFile (File) - SRT file
Reads a subtitle segment from file.
Subtitle segment consists of subtitle ID, timestamp and text. Text can be in
multiple lines. Empty line denotes end of subtitle.
Returns an array consisting of [subID, InTime, OutTime, subtitleText,
numberOfLines, completeSegment, reachedEOF]
*/
function readNextSubFromFile(activeSRTFile) {
  var buffer = "";
  var subID = 0;
  var SRTTimestamp = "";
  var subtitleText = "";
  var currentSubtitle = [];
  var numPattern = /^\d+$/;
  var timeStampPattern = /^[\d:,\ ->]+$/;
  var completeSegment = false;
  var reachedEOF = false;
  var step = 0; // 0 - subID; 1 - timestamp; 2 - subtitletext; 3 - end of sub
  var numberOfLines = 0;

  while (!(activeSRTFile.eof) && (step != 3)) {
    buffer = activeSRTFile.readln();
    switch (step) {
      case 0: // look for subID
      if (stripWhitespace(buffer) == "") break;
      if (numPattern.test(buffer)) {
        subID = buffer;
        step = 1;
      } else {
        alert("Next subID not found!");
        step = 99;
      }
      break;

      case 1: // look for timestamp
      if (timeStampPattern.test(buffer)) {
        SRTTimestamp = buffer;
        step = 2;
      } else {
        alert("Incorrect time stamp!");
        step = 98;
      }
      break;

      case 2: // read subtitle text
      if (stripWhitespace(buffer) == "") {
        step = 3;
        if (subtitleText != "") completeSegment = true;
      } else {
        subtitleText += (subtitleText == "") ? buffer : "\n" + buffer;
        numberOfLines++;
      }
      break;
    }
  }
  reachedEOF = activeSRTFile.eof;
  var timestamp = convertSRTTimestamp(SRTTimestamp);
  currentSubtitle = [subID, timestamp[0], timestamp[1], subtitleText, numberOfLines, completeSegment, reachedEOF];
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
