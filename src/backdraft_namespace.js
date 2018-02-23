import Class from "./utils/class";
import { DomVisibility, Coordinates } from "./utils/dom_visibility";
import { toCSSClass, toColumnCSSClass, extractColumnCSSClass } from "./utils/css";
import log from "./utils/logging";

import Plugin from "./plugin";
import App from "./app";

const BackdraftNamespace = {
  Utils: {
    Class,
    DomVisibility,
    Coordinates,
    toCSSClass,
    toColumnCSSClass,
    extractColumnCSSClass,
    log
  },

  plugin: Plugin.factory,
  app: App.factory
};

import "./plugins/base/register_base_plugin";
import "./plugins/listing/register_listing_plugin";

export default BackdraftNamespace;
