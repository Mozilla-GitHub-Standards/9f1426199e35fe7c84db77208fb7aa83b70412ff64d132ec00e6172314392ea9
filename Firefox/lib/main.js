/*
Questions:
- How can I use the FF password manager's built in login form detection?

*/


const {Cc,Ci,Cu} = require("chrome");

Cu.import("resource://gre/modules/PopupNotifications.jsm");

const dataDir = require("self").data;
const observers = require('observer-service');
const panel = require("panel");
const ss = require("simple-storage");
const tabs = require("tabs");
const url = require("url");

var wm = Cc["@mozilla.org/appshell/window-mediator;1"]
            .getService(Ci.nsIWindowMediator);
var win = wm.getMostRecentWindow("navigator:browser");

var loginManager = Cc["@mozilla.org/login-manager;1"].getService(Ci.nsILoginManager);
observers.add('passwordmgr-found-form',function(domObj) {
    console.log("\n\n\n\npasswordmgr-found-form");
    console.log(domObj);
    console.log("has ", domObj.querySelectorAll('input[type="password"]').length , " fields");
    if (domObj.querySelectorAll('input[type="password"]'.length == 1)) {
        console.log('Found a login form we could autofill!');
        function doAutologin() {
            loginManager.fillForm(domObj);
            domObj.submit();
        }
        if (!ss.storage.pinLockedSites) ss.storage.pinLockedSites = [];
        // TODO: activeTab probably isn't reliable in this case.
        var curHost = url.URL(tabs.activeTab.url).host;
        console.log("Site ",curHost," is pinlocked? ", ss.storage.pinLockedSites.indexOf(curHost) != -1);
        if (ss.storage.pinLockedSites.indexOf(curHost) != -1) {
            promptForPIN("Please enter your PIN to log into this site.", false, function(pinNum) {
                if (ss.storage.pin == pinNum) {
                    doAutologin();
                }
            });
        }
        else {
            doAutologin();
        }
    }
});

var pinCallbackID = 0;
var pinCallbacks = {};
function promptForPIN(promptText,repeat,callback) {
    var PINPanel = panel.Panel({
        contentURL: dataDir.url('pin_entry.html'),
        contentScriptFile: [dataDir.url('js/jquery.js'),dataDir.url('js/pin_entry.js')],
        onMessage: function(msg) {
            if (msg.type == 'request_prompt') {
                PINPanel.port.emit('set_prompt',{
                    prompt_text: promptText,
                    repeat: Boolean(repeat)
                });
                PINPanel.port.emit('set_callbackid',{
                    callback_id: pinCallbackID
                });
                pinCallbacks[pinCallbackID++] = {
                    'callback': callback,
                    'panel': PINPanel
                };
            }
            else if (msg.type == 'submit_pin') {
                pinCallbacks[msg.callback_id].callback(msg.pin);
                pinCallbacks[msg.callback_id].panel.destroy();
            }
        }
    });
    PINPanel.show();
}

// Based off of http://stackoverflow.com/questions/5809432/is-it-possible-to-set-config-settings-on-firefox-from-a-addon
function stopAutofill() {
    // Get the "signon." branch
    var prefs = Cc["@mozilla.org/preferences-service;1"]
        .getService(Ci.nsIPrefService).getBranch("signon.");

    // Set signon.autofillForms to false
    prefs.setBoolPref("autofillForms", true);
}

stopAutofill();

function getPINPromptPopup() {
    var pinPrompt = notificationsToShow.filter(function (x) { return x.id == 'pin-prompt'; });
    return pinPrompt[0];
}

function transformDoorhangerIntoPINPrompt(pinPromptElem,pinSubmitCallback) {
    console.log ('starting transformDoorhangerIntoPINPrompt for ', pinPromptElem);
    var d = pinPromptElem.ownerDocument;
    pinPromptElem.setAttribute("label", "Please enter a pin!");
    if (!pinPromptElem.button) return;
    var b = pinPromptElem.button;
    b.parentNode.firstChild.hidden = b.hidden = true;
    function advanceToNext(evt) {
        var input = this;
        // Did the user type a digit?
        if (evt.keyCode >= 48 /* '0' */ && evt.keyCode <= 57 /* '9' */) {
            // Wait a beat so that we have what the user entered.
            win.setTimeout(function() {
                console.log('input.value = ', input.value);
                if (input.value.length == 1) {
                    if (input.id == 'digit4') {
                        d.getElementById('pin-submit-button').focus();
                    }
                    else {
                        // Advance focus to the next input element.
                        if (input.nextSibling.tagName.toLowerCase() == 'input') {
                            input.nextSibling.focus();   
                        }   
                    }
                }
            },1);
        }
        else {
            // Make sure this character won't get typed.
            evt.preventDefault();
        }
    }
    var pinElements = [];
    for (var i = 0; i < 4; i++) {
        var x = d.createElementNS("http://www.w3.org/1999/xhtml", "input");
        b.parentNode.appendChild(x);
        x.type = 'password';
        x.style.fontSize = "50px";
        x.style.height = x.style.width = "1.1em";
        x.style.margin = "-10px 5px -5px";
        x.style.textAlign = "center";
        x.maxLength = 1;
        x.tabIndex = i;
        x.addEventListener('keydown',advanceToNext);
        // x.value = i;
        x.id = "digit" + (i+1).toString();
        console.log('x.id = ', x.id);
        pinElements.push(x);
    }
    var button = d.createElementNS("http://www.w3.org/1999/xhtml", "input");
    button.type = 'submit';
    button.value = 'OK';
    button.style['marginTop'] = '30px';
    button.id = 'pin-submit-button';
    button.addEventListener('click',function() {
        pinSubmitCallback(pinElements.map(function(x) { return x.value; }));
    });
    b.parentNode.parentNode.appendChild(button);
    pinPromptElem.setAttribute("icon", "chrome://mozapps/skin/passwordmgr/key-64.png");
    win.focus();
    d.querySelector('#digit1').focus();
    console.log ('finished transformDoorhangerIntoPINPrompt for ', pinPromptElem);
}

PopupNotifications.prototype._old_refreshPanel = PopupNotifications.prototype._refreshPanel;
PopupNotifications.prototype._refreshPanel = function(notificationsToShow) {
    console.log('in _refreshPanel');
    // nonCustomNotifs = notificationsToShow.filter(function(x) { return x.id != "pin-prompt"; });
    this._old_refreshPanel.apply(this,arguments);
    for (var x = 0; x < this.panel.childNodes.length; x++) {
        console.log("child #",x , " id = ", this.panel.childNodes[x].id);
    }
    var pinPromptElem = this.panel.ownerDocument.getElementById('pin-prompt-notification');
    console.log("pinPromptElem.id: ",pinPromptElem.id);
    if (pinPromptElem) {
        transformDoorhangerIntoPINPrompt(pinPromptElem, function() {
            console.log('PIN submit clicked!');
            // popupNotifications.remove(getPINPromptPopup());
        });
    }
};

PopupNotifications.prototype._old_show = PopupNotifications.prototype.show;
PopupNotifications.prototype.show = function(browser, id, message, anchorID, mainAction, secondaryActions, options)  {
    console.log("panelid: ", this.panel.id);
    // for (var x = 0; x < arguments.length; x++) {
    //     console.log('arguments[' + x + ']: ', arguments[x]);
    // }
    
    if (id == 'password-save') {
        // Modify password save popup notification to ask about PIN lock.
        message = "Persona Vault can save your password on this site.";
        secondaryActions = [mainAction];
        mainAction = {
            label: "Save and PIN Lock",
            accessKey: "P",
            callback: function() {
                console.log("User opted to save with PIN lock!");
                var curHost = url.URL(tabs.activeTab.url).host;
                if (ss.storage.pinLockedSites) {
                    ss.storage.pinLockedSites.push(curHost);
                }
                else {
                    ss.storage.pinLockedSites = [curHost];
                }
                if (!ss.storage.pin) {
                    promptForPIN("Please create a PIN",true,function(pinNum) {
                        ss.storage.pin = pinNum;
                    });
                }
                secondaryActions[0].callback.apply(this,arguments);
            }
        };
    }
    this._old_show.apply(this,arguments);
    
    var pinPromptElem = this.panel.ownerDocument.getElementById('pin-prompt-notification');
    console.log('pinPromptElem in show is truthy? ',Boolean(pinPromptElem));
    if (pinPromptElem) {
        transformDoorhangerIntoPINPrompt(pinPromptElem,mainAction.callback);
    }
    // 
    // function printChildren(c,lvl) {
    //     if (lvl === undefined) lvl = 0;
    //     printStr = "";
    //     for (var x = 0; x < lvl; x++)
    //         printStr += "\t";
    //     console.log(printStr, c.tagName, "  #", c.id, " .", c.className)
    //     for (var x = 0; x < c.childNodes.length; x++)
    //         printChildren(c.childNodes[x],lvl+1);
    // }
    // 
    // if (id == 'pin-prompt') {
    //     var notifs = this.panel.getElementsByTagName('notification');
    //     notifs = Array.prototype.slice.call(notifs);
    //     var pinIndex = notifs.map(function (x) { return x.id; }).indexOf('pin-prompt-notification');
    //     // console.log("Notifs: ", notifs.length, " pinIndex: ", pinIndex);
    //     // console.log("Notifs[0].id = ", notifs[0].id);
    // 
    //     // notifs[pinIndex].appendChild(newDiv);
    //     // while (this.panel.lastChild)
    //     //    this.panel.removeChild(this.panel.lastChild);
    // 
    // 
    //     // printChildren(notifs[pinIndex].parentNode);
    //     // for (var x = 0; x < notifs[pinIndex].childNodes.length; x++)
    //     //     console.log(notifs[pinIndex].childNodes[x]);
    // }
}


// observers.add('document-element-inserted',function(document) {
//     win.setTimeout(function() {
//         console.log('in document-element-inserted');
//         console.log('forms: ', document.forms.length);
//         if (!document.body) return;
//         var forms = document.body.getElementsByTagName('form');
//         console.log('forms.length: ',forms.length);
//         for (var form = 0; form < forms.length; form++) {
//             if (forms[form].querySelectorAll('input[type="password"]').length == 1) {
//                 console.log('attempting fill, success?  ',loginManager.fillForm(forms[form]));   
//             }
//         }        
//     },100);
// 
// });

var popup = win.PopupNotifications.show(win.gBrowser.selectedBrowser,"pin-prompt",'A notif!', null,
{
  label: "Main action",
  accessKey: "M",
  callback: function(pin) {
    console.log("Doing main action! got pin: ", pin);
  }
});