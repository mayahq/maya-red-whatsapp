const { Node, Schema, fields } = require("@mayahq/module-sdk");
const WhatsappAuth = require("../whatsappAuth/whatsappAuth.schema.js");
const axios = require("axios");
class SendWhatsapp extends Node {
  constructor(node, RED, opts) {
    super(node, RED, {
      ...opts,
      // masterKey: 'You can set this property to make the node fall back to this key if Maya does not provide one'
    });
  }

  static schema = new Schema({
    name: "send-whatsapp",
    label: "send-whatsapp",
    category: "Maya Red Whatsapp",
    isConfig: false,
    fields: {
      // Whatever custom fields the node needs.
      WhatsappAuth: new fields.ConfigNode({ type: WhatsappAuth }),
      to: new fields.Typed({
        type: "str",
        allowedTypes: ["str", "msg", "flow", "global"],
      }),

      action: new fields.SelectFieldSet({
        fieldSets: {
          sendUsingTemplate: {
            template_name: new fields.Typed({
              type: "str",
              defaultVal: "",
              allowedTypes: ["msg", "str", "flow", "global"],
            }),
            components: new fields.Typed({
                type:"json",
                defaultVal: "{}",
                allowedTypes: ["msg", "json", "flow", "global"],
            })
          },
          sendFromScratch: {
            message: new fields.Typed({
              type: "str",
              defaultVal: "",
              allowedTypes: ["str", "msg", "flow", "global"],
            }),
          },
        },
      }),
    },
  });

  onInit() {
    // Do something on initialization of node
  }

  async onMessage(msg, vals) {
    this.setStatus("PROGRESS", "Sending whatsapp message");
    // Handle the message. The returned value will
    // be sent as the message to any further nodes.
    const _this = this;
    const { WhatsappAuth } = this.credentials;
    const { to } = vals;
    const fromPhoneNumberId = vals.WhatsappAuth.fromPhoneNumberId;
    // console.log(WhatsappAuth, to, message, fromPhoneNumberId);
    // send whatsapp text message using whatsapp api
    // remove + from prefix in to
    const toNumber = to.replace("+", "");
    // remove all whitespaces from toNumber
    const toNum = toNumber.replace(/\s/g, "");
    if (vals.action.selected === "sendFromScratch") {
      const message_infos = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: toNum,
        type: "text",
        text: {
          // the text object
          preview_url: false,
          body: vals.action.childValues.message,
        },
      };

      try {
        const response = await axios.post(
          `https://graph.facebook.com/v14.0/${fromPhoneNumberId}/messages`,
          message_infos,
          {
            headers: {
              Authorization: `Bearer ${WhatsappAuth.accessToken}`,
            },
          }
        );
        this.setStatus("SUCCESS", "Sent whatsapp message");
        _this.redNode.send(msg);
      } catch (err) {
        this.setStatus("ERROR", err.message);
        msg.__isError = true;
        msg.__error = err;
        _this.redNode.send(msg);
      }
    } else if (vals.action.selected === "sendUsingTemplate") {
      const template_name = vals.action.childValues.template_name;
      console.log(vals.action.childValues.components,vals.action.childValues.components.length);
      //check if vals.action.childValues.components object is empty
      
      var message_info = {
        messaging_product: "whatsapp",
        to: toNum,
        type: "template",
        template: {
          name: template_name,
          language: {
            code: "en_US",
          },
        //   components: [
        //     {
        //       type: "body",
        //       parameters: [
        //         {
        //           type: "text",
        //           text: "name",
        //         },
        //       ],
        //     },
        //   ],
        },
      };
      if(Object.keys(vals.action.childValues.components).length === 0){
        // components is empty
        console.log('Components object is empty!');
      }
      else{
        //populate components in message_info
        message_info.template.components = vals.action.childValues.components;
      }
      try {
        const response = await axios.post(
          `https://graph.facebook.com/v14.0/${fromPhoneNumberId}/messages`,
          message_info,
          {
            headers: {
              Authorization: `Bearer ${WhatsappAuth.accessToken}`,
            },
          }
        );
        this.setStatus("SUCCESS", "Sent whatsapp message");
        _this.redNode.send(msg);
      } catch (err) {
        this.setStatus("ERROR", err.message);
        msg.__isError = true;
        msg.__error = err;
        _this.redNode.send(msg);
      }
    }
  }
}

module.exports = SendWhatsapp;
