$.ajax({
  url: '/rest/model/atg/commerce/order/purchase/CartModifierActor/addItemToBasket',
  method: 'POST',
  // dataType: 'json',
  contentType: 'application/json',
  data: JSON.stringify({
    "formSubmissionData":[
      {
        "skuId": "16551582",
        "quantity": 1,
        "productId": "16551581",
        "hasVariations": true
      }
    ]
  }),
  success: function (data) {
    console.log('success...');
    console.log(data);
  }
});