var myName = myInput();
// rest of the script

function myInput() {
var myWindow = new Window("dialog", "Form");
  // myWindow.alignChildren ="top";
  // myWindow.orientation = "row";
  var myInputGroup = myWindow.add("group");
    myInputGroup.add("statictext", undefined, "Name:");
    var myText = myInputGroup.add("edittext", undefined, "John");
      myText.characters = 20;
      myText.active = true;
  var myButtonGroup = myWindow.add("group");
    myButtonGroup.alignment = "right";
    // myButtonGroup.orientation = "column";
    myButtonGroup.add("button", undefined,"OK");
    myButtonGroup.add("button", undefined,"Cancel");
     if (myWindow.show() == 1) {
       return myText.text;
     }
     exit();
}
