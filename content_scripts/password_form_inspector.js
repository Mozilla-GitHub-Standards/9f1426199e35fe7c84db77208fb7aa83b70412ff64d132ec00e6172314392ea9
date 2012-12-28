var PasswordFormInspector = function($, PasswordForm) {
    const VALID_USERNAME_INPUT_TYPES = ['text','email','url','tel','number'];

    var idCounter = 0;

    function generateId() {
        idCounter += 1;
        return idCounter;
    }

    function getUsernameFieldForPasswordField(containerForm,passwordEl) {
        var inputsList = containerForm.find('input').get();
        var pwFieldIdx = inputsList.indexOf(passwordEl);
        for (var inputIdx = pwFieldIdx-1; inputIdx >= 0; inputIdx--) {
            if (VALID_USERNAME_INPUT_TYPES.indexOf(inputsList[inputIdx].type.toLowerCase()) != -1) {
                return inputsList[inputIdx];
            }
        }
        // Couldn't find a valid username input field.
        return null;
    }

    function findForms() {
        var $passwordInputs = $('input[type=password]'),
            result = { loginForms: [], signupForms: [], changePasswordForms: [] };

        $passwordInputs.each(function(idx,passwordEl) {
            var $passwordEl = $(passwordEl),
                $containingForm = $passwordEl.closest('form'),
                usernameEl,
                usernameFields = {},
                numPasswordInputs;
            if ($containingForm.length === 0) {
                console.log("Could not find form element, passwordEl=", $passwordEl);
                // Could not find an HTML form, so now just look for any element that
                // contains both the password field and some other input field with type=text.
                // Note: this will also find inputs with no type specified, which defaults to text.
                $containingForm = $passwordEl.parents().has('input:text').first();
            }

            if ($containingForm.length === 0) {
                return;
            }
            // Setting 'autocomplete' to 'off' will signal to the native
            // password manager to ignore this login wrt filling and capturing.
            // This solves the "double infobar" problem when linking.
            passwordEl.setAttribute('autocomplete', 'off');
            numPasswordInputs = $containingForm.find('input[type=password]').length;
            // If the containing form contains multiple password field, then ignore
            // for now. This is probably a change password field.
            if (numPasswordInputs > 1) return;
            usernameEl = getUsernameFieldForPasswordField($containingForm,passwordEl);
            if (usernameEl) {
                usernameFields["username"] = { el: usernameEl };
            }
            result.loginForms.push(new PasswordForm(generateId(), usernameFields, { el: passwordEl }, $containingForm.get(0)));
        });
        return result;
    }
    return {
        findForms: findForms
    };
};
