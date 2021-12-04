var TabControlJQ = {};

TabControlJQ.makeDiv = function(classAttr) {
   return $('<div></div>').addClass(classAttr);
}

TabControlJQ.tabify = function(root) {
   var tab, children = root.children(); 
   var tabBlock, selectedTab, rowDiv, page, spaceLeft;

   tabBlock = TabControlJQ.makeDiv('tab-block').append(children).appendTo(root);
   
   rowDiv = TabControlJQ.makeDiv('row').prependTo(tabBlock);
   spaceLeft = rowDiv.outerWidth();
   children.each(function(p) {
      var $this = $(this);
      
      page = $this.addClass('page');
      tab = TabControlJQ.makeDiv('tab').appendTo(rowDiv);
      
      tab.append(page.attr('title') || "Page " + (p+1));
      spaceLeft -= tab.outerWidth();
      if (spaceLeft < 0) {
         rowDiv.addClass('back-row');
         rowDiv = TabControlJQ.makeDiv('row').insertAfter(rowDiv).append(tab);
         spaceLeft = rowDiv.outerWidth() - tab.outerWidth();
      }
       
      tab.matchPage = page;
      tab.data('myWrapper', tab);
      tab.bind('click', function() {
         var $this = $(this).data('myWrapper');
            
         selectedTab.removeClass('selected-tab').matchPage.removeClass
          ('selected-page');
         $this.addClass('selected-tab').matchPage.addClass('selected-page');
         selectedTab = $this;
      });
   });

   selectedTab = tabBlock.find('div.row div.tab').first().data('myWrapper')
      .addClass('selected-tab');
   selectedTab.matchPage.addClass('selected-page');
};

// main function, $ here makes it wait until the webpage is loaded before the function is run.
// this way no clicks are being recorded until the page is actually up
$(function() {
   TabControlJQ.tabify(jQuery('#block1'));
   TabControlJQ.tabify($('#block2'));   // $ is shorthand for jQuery, and more common
});