
$.makeExpander = function(root) {
	if ($(root).children().length) {
		$(root).addClass('root').children().each((idx, child) => {
			child = $(child).addClass('bodyOpen');
			var ttl = $('<div></div>').addClass('titleOpen');
			ttl[0].innerHTML = child.attr('title');
			$('<div></div>').addClass('row').insertBefore(child).append(
				$('<div></div>').addClass('upButton').click(() => child.prev()
				.insertBefore(child.prev().prev().prev()).next().next().next()
				.insertBefore(child.prev().prev())), $('<div></div>')
				.addClass('downButton').click(() => child.prev().insertAfter(
				child.next().next()).prev().prev().prev().insertAfter(
				child.next().next().next())), ttl.click(() => {
					child.toggleClass('bodyOpen').toggleClass('bodyClose');
					ttl.toggleClass('titleOpen').toggleClass('titleClose');
				})
			);
		});
	}
}