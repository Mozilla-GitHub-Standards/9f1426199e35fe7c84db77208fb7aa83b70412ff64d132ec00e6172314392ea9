var CapturedCredentialStorage = function(Gombot, Uri) {

  var storage = {};

  function mergeCredentials(newCredentials, source) {
    var oldCredentials = storage[source.id];
    // TODO: revisit strict equality requirement here
    if (!oldCredentials || newCredentials.origin !== oldCredentials.origin) {
      storage[source.id] = newCredentials;
      //console.log("Storing new credentials", storage[source.id], Gombot.getCurrentUser());
      return;
    }
    if (newCredentials.password) {
      oldCredentials.password = newCredentials.password;
    }
    if (newCredentials.username) {
      oldCredentials.username = newCredentials.username;
    }
    //console.log("Merging credentials", storage[source.id], Gombot.getCurrentUser());
  }

  function cleanupLoginUrl(url) {
    var u = new Uri(url);
    u.anchor("");
    u.query("");
    u.userInfo("");
    return u.toString();
  }

  // Stores captured credentials
  // Input:
  //   credentials: object with properties:
  //     usernames: a username
  //     password: a password
  //     id: identifier for the credentials
  //   source: object with properties:
  //     id: identifier for the credential's source
  //     url: url of the credential's source
  function setCredentials(credentials, source) {
    credentials.origin = Gombot.Realms.getOriginForUri(source.url);
    credentials.loginurl = cleanupLoginUrl(source.url);
    mergeCredentials(credentials, source);
  }

  function getCrendentials(credentials, source, callback) {
    console.log("Getting credentials", storage[source.id]);
    callback(storage[source.id]);
  }

  function deleteCredentials(source) {
    console.log("Deleting credentials for tab", source.id)
    delete storage[source.id]
  }

  return {
    setCredentials: setCredentials,
    getCredentials: getCrendentials,
    deleteCredentials: deleteCredentials
  };
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = CapturedCredentialStorage;
}
