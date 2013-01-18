/*
*   browser_action.js
*
*
*   This code runs inside of the browser action popup. Enables the user
*   to choose a login and copy the corresponding password to their clipboard,
*   as well as prompting them for a PIN to view their passwords..
*
*/

var backgroundPage = chrome.extension.getBackgroundPage();
var Gombot = backgroundPage.Gombot;

function copyToClipboard(_str) {
    chrome.extension.sendMessage({
        type: 'copy_clipboard',
        str: _str
    });
}

$(document).ready(function() {
    var currentUser = Gombot.getCurrentUser();
    console.log('currentUser: ',currentUser);
    if (currentUser) {
      // The user has already signed up for Gombot, so ask for feedback.
      $('.show-after-signup').show();
      $('#feedback-link').click(function(e) {
      	chrome.tabs.create({
              url: 'https://getsatisfaction.com/gombotalpha'
      	});
        e.preventDefault();
      });
      $('#export-data-link').click(function(e) {
          backgroundPage.downloadExportDataFile();
          e.preventDefault();
      });
      initBrowserAction();
    }
    else {
      $('#signup-nag').show();
      // Display reminder to sign in to/create a Gombot account.
      $('#signup-link').click(function(e) {
          backgroundPage.startFirstRunFlow();
          e.preventDefault();
      });
    }
});

function initBrowserAction() {
  backgroundPage.getActiveTab(function(tab) {
    var newURL = backgroundPage.Uri(tab.url);
    var logins = Gombot.get('logins').filter(function(login) {
      login.get('hostname') == newURL.host();
    });
    if (logins.length == 0) {
      $('#logins').hide();
      $('#no-logins-saved').show();
      return;
    }
    // Technically, there should be only one login, and if there are more, only all or none
    // of them should be marked pin locked, but since this is still experimental,
    // I'm PIN locking if even one of them is.
    if (_.some(logins,function(login) { return login.get('pinLocked'); })) {
      $('#logins').hide();
      $('#pin-entry').show();
      var pinEntryWidget = $('[name="pin"]').get()[0];
      // Focus on first PIN digit
      $('x-pin input:first').focus();
      pinEntryWidget.addEventListener('changed', function(e) {
        // Ensure the user has finished entering their PIN.
        if (pinEntryWidget.value.length == 4) {
          if (backgroundPage.validatePIN(pinEntryWidget.value)) {
            $('#logins').show();
            $('#pin-prompt').hide();
            $('x-pin').hide();
            // The user has successfully authenticatd with their PIN,
            // so fill in the forms on the current page.
            backgroundPage.formFillCurrentTab();
          }
          else {
            $('#pin-prompt').html('Sorry, that was incorrect. Please try again.');
            $('x-pin input').val('');
            $('x-pin input:visible:first').focus();
          }
        }
      });
    }
    const PASSWORD_REPLACEMENT = '••••••••';
    for (var i in logins) {
        var passwordHTMLString = '<div class="login"><strong>' + logins[i].get('username') +
            '</strong><input class="copy-button" type="submit" value="copy" data-password="' + logins[i].get('password') + '">'
            + '<span class="fubared-password">' + PASSWORD_REPLACEMENT + '</span></div>'
        var newEl = $(passwordHTMLString);
        $('#logins').append(newEl);

    }
    $('.copy-button').click(function() {
        copyToClipboard($(this).attr('data-password'));
    });
  });
}