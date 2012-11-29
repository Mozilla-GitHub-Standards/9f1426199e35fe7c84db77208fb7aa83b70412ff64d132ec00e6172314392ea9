/*
*   infobar_hooks.js
*
*
*   Contains the callback functions for infobars.
*
*/

var infobarHooks = {
    'password_observed': function (notificationObj,infobarResponse) {
        switch (infobarResponse.user_action) {
            case 'save':
                saveToStorage(notificationObj.notification);
            break;
        
            case 'pin_lock':
                notificationObj.notification.pin_locked = true;
                saveToStorage(notificationObj.notification);
    
                if (loginsLock.type != 'pin') {
                    createPIN();
                }
            break;
        
            case 'never_for_this_site':
                neverSaveOnSite(notificationObj.notification.hostname);
            break;
        
            default:
                console.log("Unknown response from infobar!");
            break;
        }
    },
    'signup_nag': function (notificationObj,infobarResponse) {
        if (infobarResponse.user_action == 'launch_signup') {
            startFirstRunFlow();
        }
    }
}
