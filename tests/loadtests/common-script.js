/**
 * Common utility functions for load testing
 */

// Generate unique user data
function createUserData(context, events, done) {
  const r = Math.floor(Math.random() * 99999999);

  context.vars.name = `LoadTestUser${r}`;
  context.vars.email = `loadtest${r}@wholesale.com`;
  context.vars.password = "TestPassword123!";
  context.vars.role = "retailer";
  context.vars.company = `TestCompany${r}`;
  context.vars.phone = `91${String(r).padEnd(10, '0').slice(0, 10)}`;

  return done();
}

// Generate wholesaler user data
function createWholesalerData(context, events, done) {
  const r = Math.floor(Math.random() * 99999999);

  context.vars.wholeName = `WholesalerTest${r}`;
  context.vars.wholeEmail = `wholesaler${r}@wholesale.com`;
  context.vars.wholePassword = "WholesalePass123!";
  context.vars.wholeRole = "wholesaler";
  context.vars.wholeCompany = `Wholesale Corp ${r}`;
  context.vars.wholePhone = `91${String(r).padEnd(10, '0').slice(0, 10)}`;

  return done();
}

// Generate product data
function createProductData(context, events, done) {
  const r = Math.floor(Math.random() * 99999999);
  const productNames = ['Widget', 'Gadget', 'Component', 'Module', 'Device', 'Tool'];
  const categories = ['Electronics', 'Hardware', 'Software', 'Accessories', 'Parts'];

  context.vars.productName = `${productNames[Math.floor(Math.random() * productNames.length)]}${r}`;
  context.vars.productDesc = `High quality product for bulk wholesale - ${r}`;
  context.vars.productCategory = categories[Math.floor(Math.random() * categories.length)];
  context.vars.productPrice = (Math.random() * 5000 + 100).toFixed(2);
  context.vars.productStock = Math.floor(Math.random() * 10000 + 100);
  context.vars.minOrder = Math.floor(Math.random() * 100 + 10);

  return done();
}

// Generate order data
function createOrderData(context, events, done) {
  const r = Math.floor(Math.random() * 99999999);
  
  context.vars.orderId = context.vars.createdOrderId || '507f1f77bcf86cd799439011';
  context.vars.productId = context.vars.createdProductId || '507f1f77bcf86cd799439012';
  context.vars.quantity = Math.floor(Math.random() * 500 + 50);
  context.vars.notes = `Order placed for bulk purchase - ${r}`;

  return done();
}

// Save token from response
function saveToken(requestParams, responseData, context, ee, next) {
  try {
    const parsedData = typeof responseData === 'string' ? JSON.parse(responseData) : responseData;
    if (parsedData && parsedData.token) {
      context.vars.token = parsedData.token;
      console.log(`[LOAD TEST] Token saved: ${parsedData.token.substring(0, 20)}...`);
    }
  } catch (e) {
    console.log('[LOAD TEST] Could not parse token from response');
  }
  return next();
}

// Save created order ID
function saveOrderId(requestParams, responseData, context, ee, next) {
  try {
    const parsedData = typeof responseData === 'string' ? JSON.parse(responseData) : responseData;
    if (parsedData && parsedData.order && parsedData.order._id) {
      context.vars.createdOrderId = parsedData.order._id;
    }
  } catch (e) {
    console.log('[LOAD TEST] Could not parse order ID from response');
  }
  return next();
}

// Save created product ID
function saveProductId(requestParams, responseData, context, ee, next) {
  try {
    const parsedData = typeof responseData === 'string' ? JSON.parse(responseData) : responseData;
    if (parsedData && parsedData._id) {
      context.vars.createdProductId = parsedData._id;
    }
  } catch (e) {
    console.log('[LOAD TEST] Could not parse product ID from response');
  }
  return next();
}

// Save invoice ID
function saveInvoiceId(requestParams, responseData, context, ee, next) {
  try {
    const parsedData = typeof responseData === 'string' ? JSON.parse(responseData) : responseData;
    if (parsedData && parsedData._id) {
      context.vars.createdInvoiceId = parsedData._id;
    }
  } catch (e) {
    console.log('[LOAD TEST] Could not parse invoice ID from response');
  }
  return next();
}

module.exports = {
  createUserData,
  createWholesalerData,
  createProductData,
  createOrderData,
  saveToken,
  saveOrderId,
  saveProductId,
  saveInvoiceId
};
