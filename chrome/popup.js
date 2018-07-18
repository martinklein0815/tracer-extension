/* jshint esversion:6 */
/* jshint strict: false */

class Trace {
	constructor(traceName=null) {
		this.traceName = (!traceName) ? "" : traceName;
		this._actions = {};
		this._locationUrls = {};
	}

	set locationUrls(locationUrl) {
		this._locationUrls[locationURL] = locationUrl;
	}

	get locationUrls() {
		return this._locationUrls;
	}

	addAction(tracerEvent) {
		if (!this._actions) {
			this._actions = {};
		}
		if (!tracerEvent) {
			return false;
		}
		let parentId = tracerEvent.parentId;
		if (!parentId) {
			return false;
		}
		if (Object.keys(this._actions).length === 0) {
			this._actions[tracerEvent.id] = tracerEvent;
			return true;
		}
		let parentTracerEvent = this.getTracerEvent(parentId);
		if (parentTracerEvent) {
			parentTracerEvent.children[tracerEvent.id] = tracerEvent;
			return true;
		}
		return false;
	}

	// BFS
	getTracerEvent(eventId, actions=this._actions, existingQueue=null) {
		let queue = [];
		if (existingQueue && existingQueue.length > 0) {
			queue.push.apply(queue, existingQueue);
		}
		for (let eventId in actions) {
			queue.push(actions[eventId]);
		}
		while (queue.length > 0) {
			let currentEvent = queue.shift();
			if (currentEvent.id == eventId) {
				return currentEvent;
			}
			else {
				return this.getTracerEvent(eventId, actions=currentEvent.children, existingQueue=queue);
			}
		}
		return null;
	}
	
	get actions() {
		return this._actions;
	}

	static browserInfo() {
		return {
			"userAgent": navigator.userAgent,
			"resourceUrl": getResourceUrlFromStorage()
		};
	}

	static getResourceUrlFromStorage() {
		getStoredEvents().then( (items) => {
			return items[1];
		});
	}

	static toJSON(trace) {
		let traceJson = {};
		traceJson.traceName = trace.traceName;
		traceJson.locationUrls = trace.locationUrls;
		traceJson.actions = trace.actions.toString();
		/*
		let actions = [];
		for (let eventId of actions) {
			actions.push(actions[eventId]);
		}
		while (actions.length > 0) {
			let event = actions.pop();
			traceJson.actions = event.info();
		}
		*/
		return JSON.stringify(traceJson);
	}

	static fromJSON(traceJson) {
		if (traceJson instanceof string) {
			traceJson = JSON.parse(traceJson);
		}
		if (!traceJson) {
			return;
		}
		let trace = new Trace(traceName=traceJson.traceName);
		for (let lUrl of traceJson.locationUrls) {
			trace.locationUrls = lUrl;
		}
		let actions = [];
		for (let eventId of traceJson.actions) {
			actions.push(traceJson.actions[eventId]); 
		}

		while(actions.length > 0) {
			let event = actions.pop();
			let tracerEvent = new TracerEvent(
								eventName=event.name, 
								actionName=event.actionName,
								resourceUrl=event.locationUrl,
								parentId=event.parentId,
								eventId=event.id,
								eventOrder=eventOrder
							  );
			trace.addAction(tracerEvent);
			actions.push(event.children());
		}
		return trace;
	}
}

class TracerEvent {
	constructor(eventName=null, actionName=null, resourceUrl=null, parentId=null, eventId=null, eventOrder=null) {
		Event.eventCount += 1;
		this.id = (!eventId) ? this.createEventID() : eventId;
		this.name = (!eventName) ? "Event " + Event.eventCount.toString() : eventName;
		this.actionName = (!actionName) ? "click" : actionName;
		this.selectors = [];
		this.parentId = (!parentId) ? this.id : parentId;
		var resUrl = (!resourceUrl) ? Trace.getResourceUrlFromStorage() : resourceUrl;
		this.locationURL = resUrl;
		this.children = {};
		this.eventOrder = (!eventOrder) ? Event.eventCount : eventOrder;
	}

	get info() {
		let event = {};
		event.id = this.id;
		event.name = this.name;
		event.actionName = this.actionName;
		event.actionApply = this.actionApply;
		event.selector = this.selector;
		event.parentId = this.parentId;
		event.uriPattern = this.uriPattern;
		event.locationURL = this.locationURL;
		event.children = this.children;
		event.eventOrder = this.eventOrder;
		return event;
	}

	createEventID() {
		return Event.eventCount.toString() + Math.random().toString(16).slice(2);
	}
}

// the starting resource is the first/default event. the others start from 2. 
Event.eventCount = 0;
var tempNewEvents = {};
var trace = new Trace();


function createNewEventMetadata(parentId) {
	let event = new TracerEvent(eventName=null,
								actionName="click", 
								resourceUrl=null,
								parentId=parentId);
	tempNewEvents[event.id] = event;
	return event.info;
}

function createStartingResourceTrace(resUrl) {

	let event = new TracerEvent(eventName="Starting Resource",
		actionName="load",
		resourceUrl=resUrl);
	trace.addAction(event);
	return trace;
}

function createEventTypeChoices(event_id, action_type) {
	let modal = [];
    modal.push('<div class="form-group">');
    modal.push('<label for="action_type_' + event_id +'">Type</label>');
    modal.push('<select class="form-control form-control-sm" id="action_type_' + event_id + '" required>');
    if (action_type == "click") {
    	modal.push('<option value="action_type_click_'+event_id+'" selected>Click</option>');
    }
    else {
    	modal.push('<option value="action_type_click_'+event_id+'">Click</option>');
    }
    if (action_type == "select_all_links") {
    	modal.push('<option value="action_type_select_all_links_'+event_id+'" selected>Click All Links in an Area</option>');
	}
	else {
    	modal.push('<option value="action_type_select_all_links_'+event_id+'">Click All Links in an Area</option>');
	}
	/*
	if (action_type == "load") {
    	modal.push('<option value="action_type_load_'+event_id+'" selected>Load</option>');
	}
    else {
    	modal.push('<option value="action_type_load_'+event_id+'">Load</option>');
    }
	*/

    modal.push('</select>');

    modal.push('</div>');
	return modal.join("");	
}

function createClickExitCondition(event_id) {
	let modal = [];
	//modal.push('<div class="card mb-3">');
    modal.push('<div class="header">Exit Condition</div>');
    //modal.push('<div class="card-body">');
    modal.push('<div class="form-group">');

    modal.push('<div class="input-group"><div class="input-group-prepend"><div class="input-group-text">');
    modal.push('<input type="radio" value="1" name="exit_condition_' + event_id + '" checked />');
    modal.push('</div>');
    modal.push('</div>');
    modal.push('<span class="form-control form-control-sm">Element is Disabled</span>');
    modal.push('</div>');

    modal.push('<div class="input-group"><div class="input-group-prepend"><div class="input-group-text">');
    modal.push('<input type="radio" value="2" name="exit_condition_' + event_id + '" />');
    modal.push('</div>');
    modal.push('</div>');
    modal.push('<span class="form-control form-control-sm">Element doesn\'t Exist</span>');
    modal.push('</div>');

    modal.push('<div class="input-group"><div class="input-group-prepend"><div class="input-group-text">');
    modal.push('<input type="radio" value="3" name="exit_condition_' + event_id + '" />');
    modal.push('</div>');
    modal.push('</div>');
    modal.push('<span class="form-control form-control-sm">Navigated to a New Resource</span>');
    modal.push('</div>');

    modal.push('<div class="input-group"><div class="input-group-prepend"><div class="input-group-text">');
    modal.push('<input type="radio" value="4" name="exit_condition_' + event_id + '" />');
    modal.push('</div>');
    modal.push('<input type="text" id="exit_condition_num_res_archived_' + event_id + '" placeholder="#" size="2" class="form-control-sm input-group-prepend" />');
    modal.push('</div>');
    modal.push('<span class="form-control form-control-sm">Resources Archived</span>');
    modal.push('</div>');

    modal.push('</div>');
    //modal.push('</div>');
    //modal.push('</div>');
	return modal.join("");	
}

function createSelectAllLinksRepeatChoices(event_id) {
	let modal = [];
    modal.push('<div class="form-group">');
    modal.push('<label for="select_all_links_until_' + event_id +'">Click</label>');
    modal.push('<select class="form-control form-control-sm" id="select_all_links_until_' + event_id + '" required>');
    modal.push('<option value="select_all_links_until_once_' +event_id+'">Once</option>');

    modal.push('</select>');

    modal.push('</div>');
	return modal.join("");	
}

function createClickRepeatChoices(event_id) {
	let modal = [];
    modal.push('<div class="form-group">');
    modal.push('<label for="click_until_' + event_id +'">Click</label>');

    modal.push('<select class="form-control form-control-sm" id="click_until_' + event_id + '" required>');
    modal.push('<option value="click_until_once_' +event_id+'">Once</option>');

    modal.push('<option value="click_until_repeated_'+event_id+'">Until</option>');
    modal.push('</select>');

    modal.push('</div>');
	return modal.join("");	
}

function createSelectorTable(selectorInfo, eventId, readonly=false) {

    let selector = [];
    selector.push('<label>Selector Choice</label>');

    selector.push('<table class="table" style="table-layout: fixed; font-size:0.8rem;">');
    selector.push('<thead>');
    selector.push('<tr>');
    selector.push('<th class="w-25" scope="col">Type</th>');
    selector.push('<th scope="col">Value</th>');
    selector.push('</tr>');
    selector.push('</thead>');
    selector.push('<tbody>');
    for (let sel of selectorInfo) {
    	selector.push('<tr id="selector_info_'+eventId+'_'+sel.selOrder+'">');
	    selector.push('<td title="Choose Preference"><input type="radio" value="'+sel.selOrder+'" name="selector_info_preferrence_' + eventId + '" ');
	    if (!sel.selectorPreferred && sel.selectorType == "CSSSelector") {
	    	selector.push('checked');
	    }
	    else if (!sel.selectorPreferred && readonly) {
	    	selector.push('disabled');
	    }
	    selector.push(' /></td>');
    	selector.push('<td scope="text-truncate">' + sel.selectorType + '</td>');
    	selector.push('<td class="text-truncate" title="'+ sel.selector.replace(/"/g, '&quot;') + '">' + sel.selector + '</td>');
    	selector.push("</tr>");
    }
    selector.push('</tbody>');
    selector.push('</table>');
    return selector.join("");
}

function createModalEventViewer(event) {
	let event_id = event.id;

	let modal = [];
	modal.push('<div class="modal fade" id="action_modal_'+event_id+'" tabindex="-1" role="dialog">');
    modal.push('<div class="modal-dialog" role="document"><div class="modal-content"><div class="modal-header bg-dark">');
    modal.push('<h5 class="modal-title text-white" id="myModalLabel">View Event</h5>');
    modal.push('<button type="button" class="close" data-dismiss="modal" aria-label="Close"><span class="text-white" aria-hidden="true">&times;</span></button>');
    modal.push('</div>');
    // END HEADER

    // modal BODY
    modal.push('<div class="modal-body" style="font-size: 1.3em;">');
    modal.push('<form>');
    let action_name = (event.name) ? event.name : "";
    modal.push('<div class="form-group">');
    modal.push('<span class="text-muted">Name:&nbsp;</span>');
	modal.push('<span>' + action_name + '</span>');
    modal.push('</div>');

    modal.push('<div class="form-group">');
    modal.push('<span class="text-muted">Type:&nbsp;</span>');
	modal.push('<span class="text-capitalize">' + event.actionName + '</span>');
    modal.push('</div>');

    modal.push('<div class="form-group">');
    modal.push('<span class="text-muted text-capitalize">'+event.actionName+':&nbsp;</span>');
    if (!event.repeat) {
		modal.push('<span>Once</span>');
    }
    else {
		modal.push('<span>Until ' + event.repeat.until + '</span>');
    }
	modal.push('</div>');

    if (event.selectors.length > 0) {
    	modal.push(createSelectorTable(event.selectors, event_id, readonly=true));
	}

    modal.push('</form>');
    modal.push('</div></div></div></div>');
    return modal.join("");
}

function attachSelectorMouseOverEvents(event) {
	if (!event || !event.selectors) {
		return;
	}
	let noOfSelectors = event.selectors.length;
	for (let i=0; i<noOfSelectors; i++) {
		let selectorElement = $("#selector_info_"+event.id+"_"+i);
		$(selectorElement).on("mouseover", function() {
			let selector = event.selectors[i];

			chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
				chrome.tabs.sendMessage(tabs[0].id, {"highlightElements": selector});
			});
		});
		$(selectorElement).on("mouseout", function() {
			let selector = event.selectors[i];

			chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
				chrome.tabs.sendMessage(tabs[0].id, {"removeElementHighlight": selector});
			});
		});

	}
}

function createModalEventForm(event) {
	let event_id = event.id;

	let modal = [];
	modal.push('<div class="modal fade" id="action_modal_'+event_id+'" tabindex="-1" role="dialog">');
    modal.push('<div class="modal-dialog" role="document"><div class="modal-content"><div class="modal-header bg-dark">');
    modal.push('<h5 class="modal-title text-white" id="myModalLabel">Create New Event</h5>');
    modal.push('<button type="button" class="close" data-dismiss="modal" aria-label="Close"><span class="text-white" aria-hidden="true">&times;</span></button>');
    modal.push('</div>');
    // END HEADER

    // modal BODY
    modal.push('<div class="modal-body" style="font-size: 1.3em;">');
    modal.push('<form>');
    modal.push('<div class="form-group">');

    // NAME
    modal.push('<label for="action_name_' + event_id +'">Name</label>');
    let action_name = (event.name) ? event.name : "";
    modal.push('<input type="text" class="form-control form-control-sm" id="action_name_' + event_id + '" placeholder="Enter optional name for this action" value="' + action_name + '" />');
    modal.push('</div>');

    // EVENT TYPE
    modal.push(createEventTypeChoices(event_id, event.actionName));

    // REPEAT CHOICES
    modal.push('<div id="repeat_choices_'+event_id+'">');
    if (event.actionName == "click") {
    	modal.push(createClickRepeatChoices(event_id));
    }
    else if (event.actionName == "select_all_links") {
    	modal.push(createSelectAllLinksRepeatChoices(event_id));
    }
    modal.push("</div>");

    // EXIT CONDITION
    modal.push('<div id="exit_condition_'+event_id+'"></div>');

    // CHOOSE ELEMENT BUTTON
    modal.push('<div class="btn-toolbar justify-content-center">');
    modal.push('<button type="button" class="btn btn-info" id="choose_element_' + event_id + '">Choose Element in Page</button>');
    modal.push('</div>');
    modal.push('<br/>');

	modal.push('<div id="action_selector_'+event_id+'"></div>');
    modal.push('</form>');
    modal.push('<div id="event_btns_'+event_id+'">');
    modal.push('<div class="btn-toolbar justify-content-center">');
    modal.push('<div class="btn-group" role="group">');
    modal.push('<button type="button" class="btn btn-success d-none" id="save_' + event_id + '" data-dismiss="modal" disabled>Save</button>');
    modal.push("</div>");
    modal.push("</div>");
    modal.push('</div></div></div></div>');
    return modal.join("");
}

function createEventButtons(event, width_class) {
	let startingResource = false;
	if (event.actionName == "load") {
		startingResource = true;
	}
	let event_ui = [];
	event_ui.push('<div class="btn-group justify-content-end '+width_class+'" role="group">');
	event_ui.push('<button type="button" ');
	event_ui.push('id="event_' + event.id + '"');
	event_ui.push('class="btn btn-outline-primary btn-block ');
	event_ui.push(width_class + '"');
	event_ui.push('title="Introspect Event" ');
	event_ui.push('rel="tooltip" data-toggle="modal"');
	event_ui.push('data-target="#action_modal_' + event.id + '"');
	event_ui.push('>');
	event_ui.push(event.name);
	event_ui.push('</button>');
	event_ui.push('<button type="button" class="btn btn-default btn-success tracer-bg" id="create_event_for_'+event.id+'" title="Create Event"><span class="fas fa-plus-square"></span></button>');
	if (event.eventOrder == 1) {
		event_ui.push('<button type="button" class="btn btn-default btn-danger tracer-bg" id="delete_event_'+event.id+'" title="Delete Event" disabled><span class="fas fa-trash-alt"></span></button>');
	}
	else {
		event_ui.push('<button type="button" class="btn btn-default btn-danger tracer-bg" id="delete_event_'+event.id+'" title="Delete Event"><span class="fas fa-trash-alt"></span></button>');
	}

	event_ui.push('</div>');
	return event_ui.join("");
}

function getWidthForEvent(event, depth) {
	let insetWidth = 10;
	return "w-" + (100-(depth * insetWidth)).toString();
}

function getActionsByEventOrder(actions) {
	let tempActions = {};
	let sortedEvents = [];
	let eventIds = Object.keys(actions);
	for (let eventId of eventIds) {
		let currEvent = actions[eventId];
		tempActions[currEvent.eventOrder] = currEvent;
	}

	function compareNumbers(a, b) {
		return b-a;
	}
	let eventOrder = Object.keys(tempActions).sort(compareNumbers);

	for (let eo of eventOrder) {
		sortedEvents.push(tempActions[eo]);
	}
	return sortedEvents;
}

function createEventUI(actions) {
	// DFS
	let stack = [];
	let eventIds = Object.keys(actions);

	for (let eventId of eventIds) {
		stack.push(actions[eventId]);
	}

	let parentIds = {};
	parentIds[stack[0].id] = 0;
	$("#event_ui").empty();

	while (stack.length > 0) {
		let ui = [];
		let currEvent = stack.pop();
		let widthClass = getWidthForEvent(currEvent, parentIds[currEvent.id]);
		ui.push(createEventButtons(currEvent, widthClass));
		ui.push(createModalEventViewer(currEvent));
		$("#event_ui").append(ui.join(""));
		attachCreateDeleteButtonEvents(currEvent);
    	attachSelectorMouseOverEvents(event);
    	let sortedChildren = getActionsByEventOrder(currEvent.children);
		for (let event of sortedChildren) {
			stack.push(event);
			parentIds[event.id] = parentIds[event.parentId] + 1;
		}
	}
}

function attachCreateDeleteButtonEvents(event) {
	$("#create_event_for_" + event.id).on("click", function() {
		getStoredEvents().then( (items) => {

			let events = items[0];
			//let eventCount = Object.keys(items.events.actions).length;
			let newEventData = createNewEventMetadata(event.id);
			let newEventModal = createModalEventForm(newEventData);
			$("#event_ui").append(newEventModal);
			$("#action_modal_"+newEventData.id).modal("show");
			attachModalCloseEvents(newEventData.id);
			attachActionTypeSelectMenuEvents(newEventData.id);
			attachClickUntilExitConditions(newEventData.id);
			attachChooseElementEventListener(newEventData.id);
			attachSaveEventListener(newEventData.id);
		});
	});
}

function attachModalCloseEvents(eventId) {
	$("#action_modal_"+eventId).on("hidden.bs.modal", function() {
		chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
			chrome.tabs.sendMessage(tabs[0].id, {detachRecorder: true});
		});
		createEventUI(trace.actions);
	});
}

function attachSaveEventListener(eventId) {
	$("#save_" + eventId).on("click", function() {
		let currentEvent = tempNewEvents[eventId];
		trace.addAction(currentEvent);
		let event = {};
		let startingEventId = Object.keys(trace.actions)[0];
		let resUrl = trace.actions[startingEventId].locationURL;
		event[resUrl] = trace;
		chrome.storage.local.set(event);
	});
}

function attachChooseElementEventListener(eventId) {
	$("#choose_element_"+eventId).on("click", function() {
		$(this).attr("disabled", true);
		let event_type = $("#action_type_" + eventId + " :selected").text();
		let message = {};
		if (event_type == "Click") {
			message["attachRecorder"] = [["click", "mouseover"], eventId, "click"];
		}
		else if (event_type == "Click All Links in an Area") {
			message["attachRecorder"] = [["click", "mouseover"], eventId, "select_all_links"];
		}
		chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
			chrome.tabs.sendMessage(tabs[0].id, message);
		});
	});
}

function attachActionTypeSelectMenuEvents(eventId) {
	$("#action_type_" + eventId).on("change", function() {
		let selected_action = $("#action_type_" + eventId + " :selected").text();
		if (selected_action == "Click") {
			let repeat_choices = createClickRepeatChoices(eventId);
			$("#repeat_choices_" + eventId).html(repeat_choices);
			attachClickUntilExitConditions(eventId);
		}
		else if (selected_action == "Click All Links in an Area") {
			let repeat_choices = createSelectAllLinksRepeatChoices(eventId);
			$("#repeat_choices_" + eventId).html(repeat_choices);
		}
	});
}

function attachClickUntilExitConditions(eventId) {
	$("#click_until_" + eventId).on("change", function() {
		let selected_action = $("#click_until_" + eventId + " :selected").text();
		if (selected_action == "Until") {
			let exit_condition = createClickExitCondition(eventId);
			$("#exit_condition_" + eventId).html(exit_condition);
			attachClickExitConditionEvents(eventId);
		}
		else if (selected_action == "Once") {
			$("#exit_condition_" + eventId).empty();
		}
	});
}

function attachClickExitConditionEvents(eventId) {
	$("input[name=exit_condition_"+eventId+"]").on("change", function() {
		let checked_condition = $(this).val();
		let cond = checked_condition;
		if (checked_condition == "4") {
			cond = $("exit_condition_num_res_archived_" + eventId).val();
		}
	});
}

function getItemsFromStorage() {
	return new Promise( (resolve, reject) => {
		chrome.storage.local.get(null, function(items) {
			console.log(items);
			chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
				var resource_url = tabs[0].url;
				let value = {};

				if (items.hasOwnProperty(resource_url)) {
					value = items[resource_url];
				}
				resolve([value, resource_url]);
			});
		});
	});
}

function updateEventModalUI(event) {
    var eventId = event.id;
    var selectorEle = $("#action_selector_" + eventId);
    var selectorUI = createSelectorTable(event.selectors, eventId);
    selectorEle.html(selectorUI);
    attachSelectorMouseOverEvents(event);

    $("#choose_element_"+eventId).attr("disabled", true);
    $("#action_type_"+eventId).attr("disabled", true);
    $("#click_until_"+eventId).attr("disabled", true);
    $("#select_all_links_until_"+eventId).attr("disabled", true);
    $("#exit_condition_"+eventId+" :radio:not(:checked)").attr("disabled", true);
    $("#save_"+eventId).attr("disabled", false);
    $("#save_"+eventId).removeClass("d-none");
}

function updateEvent(selectors) {
	let eventId = selectors.eventId;
	if (!tempNewEvents.hasOwnProperty(eventId)) {
		return false;
	}
	tempNewEvents[eventId].selectors = selectors.elementSelectors;
	tempNewEvents[eventId].id = eventId;
	return tempNewEvents[eventId];
}

// caching the aysnc storage lookup.
// from https://stackoverflow.com/questions/31709987/caching-javascript-promise-results
function cache(fn) {
	var NO_RESULT = {};
	var res = NO_RESULT;
	return function() {
		if (res === NO_RESULT) {
			return (res = fn.apply(this, arguments));
		}
		return res;
	};
}

var getStoredEvents = cache(getItemsFromStorage);

( function() {
	getStoredEvents()
		.then( (items) => {
			let events = items[0];
			let resource_url = items[1];
			cachedEvents = events;
			cachedResourceURL = resource_url;

			console.log(events);
			if (!items.trace || !items.trace.actions) {
				items.trace = trace;
				chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
					let resUrl = tabs[0].url;
					items.trace.addAction(createStartingResourceTrace(resUrl));
					createEventUI(items.trace.actions, resource_url);
				});
			}
			else {
				createEventUI(items.trace.actions, resource_url);
			}
		});
})();


chrome.runtime.onMessage.addListener( function(msg, sender) {
	if (msg.chosenSelectors) {
		let newEvent = updateEvent(msg.chosenSelectors);
		updateEventModalUI(newEvent);
	}
});