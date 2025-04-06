// Utility function to send a response
const sendResponse = ({ res, success, statusCode, message, data = null }) => {
  const response = {
    success,
    statusCode,
    message,
    data,
  };

  // Send response with the appropriate status code
  return res.status(statusCode).json(response);
};

// Handle Error function using sendResponse
const HandleError = ({
  res,
  error,
  defaultMessage = 'Something went wrong',
  statusCode = 400,
  data = null,
}) => {
  // console.log(error);
  const message = error?.message || defaultMessage;
  const status = statusCode;

  return sendResponse({
    res,
    success: false,
    statusCode: status,
    message,
    data,
  });
};

// Success function using sendResponse
const Success = ({ res, data, message = '', statusCode = 200 }) => {
  return sendResponse({ res, success: true, statusCode, message, data });
};

module.exports = {
  Success,
  HandleError,
};
