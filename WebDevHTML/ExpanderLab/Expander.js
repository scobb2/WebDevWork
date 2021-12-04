// must not exceed 80 nonblank lines
var Expander = {};

Expander.makeDiv = function(classAttr) {
   var div = document.createElement('div');
   div.setAttribute('class', classAttr);
   return div;
}

Expander.makeExpander = function(root) {
   var children = root.childNodes;
   var body = [];
   var child;

   root.setAttribute('class', 'root');

   section = Expander.makeDiv('section');
   while (children.length) {
      child = children[0];
      if (child.nodeType === 3) // whitespace code
         root.removeChild(child);
      else {
         body.push(child);
         section.appendChild(child);
      }
   }

   for (i = 0; i < body.length; i++) {
      // Set up arrows
      upImg = document.createElement('img');
      upImg.src = 'up.png';
      upImg.setAttribute('class', 'img');
    
      dwnImg = document.createElement('img');
      dwnImg.src = 'down.png';
      dwnImg.setAttribute('class', 'img');

      // Set up a row w imgs and titles
      row = Expander.makeDiv('row' + i);
      row.setAttribute('class', 'row');
      row.appendChild(upImg);
      row.appendChild(dwnImg);
      title = Expander.makeDiv('title' + i);
      title.setAttribute('class', 'titleOpen');
      // Gets title from HTML
      title.innerHTML = body[i].getAttribute('title');

      // Body Controller
      bodyCtlr = Expander.makeDiv('txtblock' + i);
      bodyCtlr.setAttribute('class', 'bodyOpen');

      // Fill in the page
      txtblock = Expander.makeDiv('txtblock' + i);
      root.appendChild(txtblock);

      // Move section up unless at top of div
      upImg.addEventListener('click', function() {
         if (this.parentElement.parentElement.parentElement.firstChild
          === this.parentElement.parentElement) {}
         else
            root.insertBefore(this.parentElement.parentElement, 
             this.parentElement.parentElement.previousElementSibling);

      });

      // Move section down unless at bottom of div
      dwnImg.addEventListener('click', function() {
         if (this.parentElement.parentElement.parentElement.lastElementChild
          === this.parentElement.parentElement) {}
         else {
            if (this.parentElement.parentElement.nextSibling.nextSibling)
               root.insertBefore(this.parentElement.parentElement, 
                this.parentElement.parentElement.nextSibling.nextSibling);
            else
               root.appendChild(this.parentElement.parentElement);
         }
      });

      // Open and close sections of text
      title.addEventListener('click', function() {
         if (this.parentElement.lastElementChild.className === 'titleOpen') {
            this.parentElement.lastElementChild.setAttribute
             ('class', 'titleClose');
            this.parentElement.parentElement.lastElementChild.setAttribute
             ('class', 'bodyClose');
         }
         else {
            this.parentElement.lastElementChild.setAttribute
             ('class', 'titleOpen');
            this.parentElement.parentElement.lastElementChild.setAttribute
             ('class', 'bodyOpen')
         }
      });

      row.appendChild(title); // add titles to rows
      txtblock.appendChild(row); // add row to textbox

      bodyCtlr.appendChild(body[i]); // add each body to the controller
      txtblock.appendChild(bodyCtlr); // add the contoller to the textbox
  }
}