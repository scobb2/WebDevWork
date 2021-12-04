var TabControl = {};

TabControl.makeDiv = function(classAttr) {
   var div = document.createElement('div');
   
   div.setAttribute('class', classAttr);
   return div;
}

TabControl.tabify = function(root) {
   var tab, tabs = [], pages = [], children = root.childNodes; 
   var tabBlock, selectedTab, rowDiv, page, spaceLeft, p;
   
   tabBlock = TabControl.makeDiv('tab-block');
   
   console.log("Length is " + children.length);
   // for (p = 0; p < children.length; p++)  // This actually won't work.  Since the children "array" is dynamic it'll skip elements
   //    page = children[p];
   
   while (children.length) {
      page = children[0];
      // console.log(`Child is |${page.textContent}|`);
      if (page.nodeType === 3) 
         root.removeChild(page);
      else {
         pages.push(page);
         tabBlock.appendChild(page);
      }
   }
   root.appendChild(tabBlock);               // Could this go earlier?
   
   rowDiv = TabControl.makeDiv('');          // New row division
   tabBlock.insertBefore(rowDiv, pages[0]);  // Right before first page
   spaceLeft = rowDiv.offsetWidth;           // Must have parent to have width
   for (p = 0; p < pages.length; p++) {
      pages[p].setAttribute('class', 'page');
      tabs.push(tab = TabControl.makeDiv('tab'));
      tab.appendChild(document.createTextNode
       (pages[p].getAttribute('title') || "Page " + (p+1)));
      
      rowDiv.appendChild(tab);               // Can swap with next line?
      spaceLeft -= tab.offsetWidth;

      if (spaceLeft < 0) {
         rowDiv.setAttribute('class', 'row back-row');
         tabBlock.insertBefore(rowDiv = TabControl.makeDiv(''), pages[0]);
         rowDiv.appendChild(tab);
         spaceLeft = rowDiv.offsetWidth - tab.offsetWidth;  
      }
   }
   rowDiv.setAttribute('class', 'row');
   
   for (j = 0; j < tabs.length; j++) {
      tabs[j].matchPage = pages[j];
      tabs[j].addEventListener('click', function() {
         selectedTab.setAttribute('class', 'tab');  // selectedTab initialized?
         selectedTab.matchPage.setAttribute('class', 'page');
         this.setAttribute('class', 'tab selected-tab');
         this.matchPage.setAttribute('class', 'page selected-page');
         selectedTab = this;
      });
   }

   selectedTab = tabs[0];                
   selectedTab.setAttribute('class', 'tab selected-tab');
   selectedTab.matchPage.setAttribute('class', 'page selected-page');
};

window.onload = function() {
   TabControl.tabify(document.getElementById('block1'));
   TabControl.tabify(document.getElementById('block2'));
};
