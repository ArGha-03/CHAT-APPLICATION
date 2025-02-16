(function($) {

	"use strict";

	var fullHeight = function() {

		$('.js-fullheight').css('height', $(window).height());
		$(window).resize(function(){
			$('.js-fullheight').css('height', $(window).height());
		});

	};
	fullHeight();

	$('#sidebarCollapse').on('click', function () {
      $('#sidebar').toggleClass('active');
  });

})(jQuery);

// ----------------- Start group chat -----------------
function getCookie(name) {
	let matches = document.cookie.match(new RegExp(
		"(?:^|; )" + name.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, '\\$1') + "=([^;]*)"
	));
	return matches ? decodeURIComponent(matches[1]) : undefined;
}
var userData = JSON.parse(getCookie("user"));

var sender_id = userData._id;
var receiver_id;
var socket = io("/user-namespace", {
	auth: {
	token: userData._id
	}
});
$(document).ready(function() {
	$(".user-list").click(function() {
	var userId = $(this).attr("data-id");
	var ReceiverName = $(this).attr("Name");
	var ReceiverImage = $(this).attr("Image");
	receiver_id = userId;
	var status = ($(this).attr("status") == 0) ? 'Offine' : 'Online';
	let html = `
	<div class="image"><img src="http://127.0.0.1:5000/` + ReceiverImage + `%>" alt=""></div>
	<div class="details"> <h3>` + ReceiverName + `</h3></div>`;
	$(".content-header").html(html);
	$(".chat-section").show();
	socket.emit("existsChat", {
		sender_id: sender_id,
		receiver_id: receiver_id
	});
	});
});
//update user online status
socket.on("getOnlineUser", function(data) {
	$("#" + data.user_id + "-status").text("Online");
	$("#" + data.user_id + "-status").removeClass("offline-status");
	$("#" + data.user_id + "-status").addClass("online-status");
});
//update user offline status
socket.on("getOfflineUser", function(data) {
	$("#" + data.user_id + "-status").text("Offline");
	$("#" + data.user_id + "-status").addClass("offline-status");
	$("#" + data.user_id + "-status").removeClass("online-status");
});

//chat save of user
$("#chat-form").submit(function(event) {
	event.preventDefault();
	var message = $("#message").val();
	$.ajax({
	url: "save-chat",
	type: "POST",
	data: {
		sender_id: sender_id,
		receiver_id: receiver_id,
		message: message
	},
	success: function(response) {
		if (response.success) {
		let currentDateTime = new Date();
		let hours = currentDateTime.getHours();
		let minutes = currentDateTime.getMinutes();
		var ampm = hours >= 12 ? 'PM' : 'AM';
		hours = hours % 12;
		hours = hours ? hours : 12;
		if (hours < 10) hours = '0' + hours;
		if (minutes < 10) minutes = '0' + minutes;
		var formattedTime = hours + ':' + minutes + ' ' + ampm;
		$("#message").val("");
		let chat = response.data.message;
		let html = `
		<div class="current-user-chat" id="` + response.data._id + `">
			<h5 class="message-content"><span>` + chat + `</span>
			<i class="fa fa-trash" aria-hidden="true" data-id='` + response.data._id + `' data-toggle="modal" data-target="#deleteChatModal"></i>
			<i class="fa fa-edit" aria-hidden="true" data-id='` + response.data._id + `' data-msg='` + chat + `' data-toggle="modal" data-target="#editChatModal"></i>
			<div class="message-timestamp-right">` + formattedTime + `</div>
			</h5>
		</div>
		`;
		$("#chat-container").append(html);
		socket.emit("newChat", response.data);
		scrollChat();
		} else {
		alert(data.msg);
		}
	}
	});
});
socket.on("loadNewChat", function(data) {
	if (sender_id == data.receiver_id && receiver_id == data.sender_id) {
	let currentDateTime = new Date();
	let hours = currentDateTime.getHours();
	let minutes = currentDateTime.getMinutes();
	var ampm = hours >= 12 ? 'PM' : 'AM';
	hours = hours % 12;
	hours = hours ? hours : 12;
	if (hours < 10) hours = '0' + hours;
	if (minutes < 10) minutes = '0' + minutes;
	var formattedTime = hours + ':' + minutes + ' ' + ampm;
	let html = `
	<div class="distance-user-chat" id="` + data._id + `">
		<h5 class="message-content"><span>` + data.message + `</span></h5>
		<div class="message-timestamp-right">` + formattedTime + `</div>
	</div>
	`;
	$("#chat-container").append(html);
	}
	scrollChat();
});

// load old chats
socket.on("loadChats", function(data) {
	$("#chat-container").html("");

	var chats = data.chats;
	let html = "";
	for (let x = 0; x < chats.length; x++) {
	let addClass = "";
	const timestamp = new Date(chats[x]["createdAt"]);
	const options = {
		hour: "2-digit",
		minute: "2-digit",
		hour12: true
	};
	const formattedTime = timestamp.toLocaleString("en-US", options);
	addClass =
		chats[x]["sender_id"] == sender_id ?
		"current-user-chat" :
		"distance-user-chat";
	html +=`
	<div class='`+addClass +`' id='`+chats[x]["_id"] +`'>
		<h5 class="message-content"><span>`+chats[x]["message"] +`</span>`;
	if (chats[x]["sender_id"] == sender_id) {
		html += `
		<i class="fa fa-trash" aria-hidden="true" data-id='` + chats[x]["_id"] + `' data-toggle="modal" data-target="#deleteChatModal" ></i>
		<i class="fa fa-edit" aria-hidden="true" data-id='` + chats[x]["_id"] + `' data-msg='` + chats[x]['message'] + `' data-toggle="modal" data-target="#editChatModal"></i>`;
	}
	html +=`
		<div class="message-timestamp-right">`+formattedTime +`</div>
		</h5>
	</div>`;
	}
	$("#chat-container").append(html);
	scrollChat();
});

function scrollChat() {
	$("#chat-container").animate({
		scrollTop: $("#chat-container").offset().top +
		$("#chat-container")[0].scrollHeight
	},
	0
	);
}

$(document).on("click", ".fa-trash", function() {
	let msg = $(this).parent().text();
	$("#delete-message").text(msg);
	$("#delete-message-id").val($(this).attr("data-id"));
	console.log("Hello world")
});

$("#delete-chat-form").submit(function(event) {
	event.preventDefault();

	var id = $("#delete-message-id").val();

	$.ajax({
	url: "/delete-chat",
	type: "POST",
	data: {
		id: id
	},
	success: function(res) {
		if (res.success == true) {
		$("#" + id).remove();
		$("#deleteChatModal").modal("hide");
		socket.emit("chatDeleted", id);
		} else {
		alert(res.msg);
		}
	}
	});
});
socket.on("chatMessageDeleted", function(id) {
	$("#" + id).remove();
});
//update user chat functionality
$(document).on('click', '.fa-edit', function() {
	$('#edit-message-id').val($(this).attr('data-id'));
	$('#update-message').val($(this).attr('data-msg'));
});
$("#update-chat-form").submit(function(event) {
	event.preventDefault();

	var id = $("#edit-message-id").val();
	var msg = $("#update-message").val();
	$.ajax({
	url: "/update-chat",
	type: "POST",
	data: {
		id: id,
		message: msg
	},
	success: function(res) {
		if (res.success == true) {
		$("#editChatModal").modal("hide");
		$('#' + id).find('span').text(msg);
		$('#' + id).find('.fa-edit').attr('data-msg', msg);
		socket.emit("chatUpdated", {
			id: id,
			message: msg
		});
		} else {
		alert(res.msg);
		}
	}
	});
});
socket.on('chatMessageUpdated', function(data) {
	$('#' + data.id).find('span').text(data.message);
});