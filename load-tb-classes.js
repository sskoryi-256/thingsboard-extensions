/*
 * ThingsBoard, Inc. ("COMPANY") CONFIDENTIAL
 *
 * Copyright © 2016-2026 ThingsBoard, Inc. All Rights Reserved.
 *
 * NOTICE: All information contained herein is, and remains
 * the property of ThingsBoard, Inc. and its suppliers,
 * if any.  The intellectual and technical concepts contained
 * herein are proprietary to ThingsBoard, Inc.
 * and its suppliers and may be covered by U.S. and Foreign Patents,
 * patents in process, and are protected by trade secret or copyright law.
 *
 * Dissemination of this information or reproduction of this material is strictly forbidden
 * unless prior written permission is obtained from COMPANY.
 *
 * Access to the source code contained herein is hereby forbidden to anyone except current COMPANY employees,
 * managers or contractors who have executed Confidentiality and Non-disclosure agreements
 * explicitly covering such access.
 *
 * The copyright notice above does not evidence any actual or intended publication
 * or disclosure  of  this source code, which includes
 * information that is confidential and/or proprietary, and is a trade secret, of  COMPANY.
 * ANY REPRODUCTION, MODIFICATION, DISTRIBUTION, PUBLIC  PERFORMANCE,
 * OR PUBLIC DISPLAY OF OR THROUGH USE  OF THIS  SOURCE CODE  WITHOUT
 * THE EXPRESS WRITTEN CONSENT OF COMPANY IS STRICTLY PROHIBITED,
 * AND IN VIOLATION OF APPLICABLE LAWS AND INTERNATIONAL TREATIES.
 * THE RECEIPT OR POSSESSION OF THIS SOURCE CODE AND/OR RELATED INFORMATION
 * DOES NOT CONVEY OR IMPLY ANY RIGHTS TO REPRODUCE, DISCLOSE OR DISTRIBUTE ITS CONTENTS,
 * OR TO MANUFACTURE, USE, OR SELL ANYTHING THAT IT  MAY DESCRIBE, IN WHOLE OR IN PART.
 */
const fs = require('fs');
const postcss = require('postcss');
const selectorParser = require('postcss-selector-parser');
const path = require("path");

const tbStylesCss = path.resolve(path.join('.', 'node_modules', 'thingsboard', 'src', 'styles.css'));
const distDir = path.resolve(path.join('.', 'dist'));
const tbClassesJson = path.resolve(path.join(distDir, 'tbClasses.json'));
const classes = new Set();

const collectClassesPlugin = (opts = {}) => {
  return {
    postcssPlugin: 'collect-classes',
    Once (root, { result }) {
      root.walkRules((rule) => {
        selectorParser((selectors) => {
          selectors.walkClasses((classNode) => {
            classes.add(classNode.value);
          });
        }).processSync(rule.selector);
      });
    }
  }
}

collectClassesPlugin.postcss = true;

const plugin = (opts = {}) => {
  return {
    postcssPlugin: 'collect-tb-classes',
    async Once (root, { result }) {
      const css = fs.readFileSync(tbStylesCss, 'utf8');
      await postcss([collectClassesPlugin])
        .process(css, {from: tbStylesCss}).then(() => {
        const classesArray = Array.from(classes);
        if (!fs.existsSync(distDir)) {
          fs.mkdirSync(distDir);
        }
        fs.writeFileSync(tbClassesJson, JSON.stringify(classesArray, null, 2), 'utf8');
      }).catch((error) => {
        console.error('Error in CSS:', error);
      });
    }
  }
}

plugin.postcss = true;

module.exports = plugin;
