// w = new Window("dialog", "Example", undefined, {closeButton:false});
// w.add("statictext", undefined, "closebutton:false");
// w.show();

// w = new Window("dialog", "Example", undefined, {borderless:true});
// w.margins = [0,0,0,0];
// myPanel = w.add("panel");
// myPanel.add("statictext", undefined, "borderless:true");
// w.show();

// w = new Window('dialog');
//   w.grp1 = w.add('group');
//     w.grp1.add('panel', [0,0,100,100], 'None', {borderStyle:'none'});
//     w.grp1.add('panel', [0,0,100,100], 'Gray', {borderStyle:'gray'});
//     w.grp1.add('panel', [0,0,100,100], 'Black', {borderStyle:'black'});
//     w.grp1.add('panel', [0,0,100,100], 'White', {borderStyle:'white'});
//   w.grp2 = w.add('group');
//     w.grp2.add('panel', [0,0,100,100], 'Etched', {borderStyle:'etched'});
//     w.grp2.add('panel', [0,0,100,100], 'Sunken', {borderStyle:'sunken'});
//     w.grp2.add('panel', [0,0,100,100], 'Raised', {borderStyle:'raised'});
// w.show();


var w = new Window("palette");
  w.grpAlign = w.add("group");
    w.grpAlign.add("statictext", undefined, "Alignment", {characters: 20, justify: "right"});
    var dropAlign = w.grpAlign.add("dropdownlist", undefined, ["Top", "Middle", "Bottom"]);
    dropAlign.selection = 1;
  w.grpRounding = w.add("group");
    w.grpRounding.add('statictext {text: "Keyframe rounding"}');
    var dropRounding = w.grpRounding.add("dropdownlist", undefined, ["Round up", "Round down", "Round math", "No rounding"]);
    dropRounding.selection = 2;
  w.grpExtend = w.add("group");
    w.grpExtend.add('statictext {text: "Extend timeline"}');
    var dropExtend = w.grpExtend.add("dropdownlist", undefined, ["Don't extend", "Extend till last keyframe", "Extend 5 sec past last keyframe"]);
    dropExtend.selection = 0;
  w.grpButtons = w.add("group");
    w.grpButtons.butGo = w.add("button", undefined, "Go!");
  w.grpStatus = w.add("group");

  // w.grpButtons.butGo.onClick = dropAlert;
w.show();

var dropAlert = function (){};

dropAlign.onChange = function () {
  if (dropAlign.selection == 0) {
    dropAlert = alertOne;
  } else {
    dropAlert = alertTwo;
  }
alert("switch");
w.grpButtons.butGo.onClick = dropAlert;
}

function alertOne() {
  alert("Jeden");
}

function alertTwo() {
  alert("Dwa");
}
