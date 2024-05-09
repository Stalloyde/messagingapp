exports.signupGET = async (req, res, next) => {
  res.send('GET - Sign Up page');
};

exports.signupPOST = async (req, res, next) => {
  res.send('POST - Sign Up page');
};

exports.loginGET = async (req, res, next) => {
  res.send('GET - Login page');
};

exports.loginPOST = async (req, res, next) => {
  res.send('POST - Login page');
};

exports.homeGET = async (req, res, next) => {
  res.send(
    'GET - Home Page. Get all contacts and most recent message. Should be authorized to access',
  );
};

exports.contactRequestsGET = async (req, res, next) => {
  res.send('GET - Page to add contacts. Should be authorized to access');
};

exports.contactRequestsPOST = async (req, res, next) => {
  res.send(
    'POST - Search for username in the input. Should be authorized to access',
  );
};

//need a controller to handle sending contact request.. how to do?

exports.idMessagesGET = async (req, res, next) => {
  res.send('GET messages from userId. Should be authorized to access');
};

exports.idMessagesPOST = async (req, res, next) => {
  res.send('POST messages to userId. Should be authorized to access');
};
