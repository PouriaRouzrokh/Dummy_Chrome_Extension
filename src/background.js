import { makeUppercase } from './uppercase.js'; 
import _ from 'lodash';
import reverse from 'reverse-string';

// Define the context menu items
let contextMenuItems = {
  uppercaseText: "Uppercase",
  capitalizeText: "Capitalize",
  reverseText: "Reverse",
};

// Create the context menu
function createContextMenu() {
  // Remove existing context menus first
  chrome.contextMenus.removeAll(() => {
    // Create the parent menu item "Macros"
    chrome.contextMenus.create({
      id: "macros",
      title: "Macros",
      contexts: ["selection"],
    });

    // Create submenus for each macro
    for (let key in contextMenuItems) {
      chrome.contextMenus.create({
        id: key,
        title: contextMenuItems[key],
        parentId: "macros",
        contexts: ["selection"],
      });
    }
  });
}

// Create the context menu when the extension is installed
chrome.runtime.onInstalled.addListener(() => {
  createContextMenu();
});

// Message listener to handle renaming macros
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "renameMacros") {
    contextMenuItems = {
      uppercaseText: request.uppercaseText,
      capitalizeText: request.capitalizeText,
      reverseText: request.reverseText
    };
    createContextMenu();
    sendResponse({ status: "success" });
  }
});

// Handle menu item clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  let modifiedText;

  if (info.menuItemId === "uppercaseText" && info.selectionText) {
    modifiedText = makeUppercase(info.selectionText);
  } else if (info.menuItemId === "capitalizeText" && info.selectionText) {
    modifiedText = _.capitalize(info.selectionText);
  } else if (info.menuItemId === "reverseText" && info.selectionText) {
    modifiedText = reverse(info.selectionText);
  }

  if (modifiedText) {
    // Save the modified text to chrome.storage
    chrome.storage.local.set({ modifiedText }, () => {
      console.log("Modified text saved to storage:", modifiedText);
    });
  }
});
