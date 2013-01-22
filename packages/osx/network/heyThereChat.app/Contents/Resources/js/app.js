(function(){

	function replaceURLWithHTMLLinks(text) {
	    var exp = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;
	    return text.replace(exp,"<a href='$1' target='_blank'>$1</a>"); 
	};

	Tinycon.setOptions({
	    width: 7,
	    height: 9,
	    font: '10px arial',
	    colour: '#ffffff',
	    background: '#549A2F',
	    fallback: true
	});


	var App = {
		Views : {},
		Models : {},
		Collections : {}
	};
	App.Views.Main = Backbone.View.extend({
		notifications : [],

		initialize : function(){
			this.templates = {
				message : _.template($.trim($('#template-message').text()))
			};
			this.connect();
			this.layout();

			if(this.storedUser()){
				this.bind();
				this.socket.emit('user.new', this.user);	
			} else {
				this.showLogin();
			}
			

			$(window).on("resize", $.proxy(this.layout, this));
			$(window).on("mousemove", $.proxy(this.active, this));
		},

		el : $('#app'),

		events : {
			'click .btn-login-submit' : 'login',
			'keydown #message-input' : 'keydown',
			'keyup #message-input' : 'keyup',
			'click #user-list li' : 'mentionUser',
		},

		layout : function(){
			$('#messages').css("height", $(window).height() - 70);
		},

		showLogin : function(){
			$('#user-new').modal();
		},

		keydown : function(event){
			if(!this.shift && event.keyCode === 13){
				var $input = $(event.currentTarget);
				this.socket.emit('message', $.trim($input.val()));
				$input.val('');
				event.preventDefault();
			} else if(event.keyCode === 16){
				this.shift = true;
			} else {
				this.socket.emit('typing');
			}
		},

		keyup : function(event){
			if(event.keyCode === 16){
				this.shift = false;
			}
		},

		active : function(){
			if(this.notifications.length > 0){
				this.clearNotifications();
			}

			this.lastActive = new Date();
		},

		clearNotifications : function(){
			this.$el.find(".message.new").removeClass("new");
			this.notifications = [];
			Tinycon.setBubble(0);
		},

		storedUser : function(){
			if(! "localStorage" in window){
				alert("Upgrade your Browser!");
				return false;
			};	

			if( localStorage.getItem("user.name")){
				this.user = {
					email : localStorage.getItem("user.email"),
					name : localStorage.getItem("user.name")
				};

				return true;
			}
			
		},

		login : function(){
			var $modal = $('#user-new').modal('hide'),
				data = $modal.find('form').serializeArray();

			this.user = {
				name : data[0].value,
				email : data[1].value
			};

			this.bind();
			this.socket.emit('user.new', this.user);	

			if(! "localStorage" in window){
				return alert("Upgrade your Browser!");
			};	

			localStorage.setItem("user.name", this.user.name);
			localStorage.setItem("user.email", this.user.email);
		},
		connect : function(){
			this.socket = io.connect(document.location.hostname + ':8080');
		},

		bind : function(){
			this.socket.on('message', $.proxy(this.renderMessage, this));
			this.socket.on('typing', $.proxy(this.renderTyping, this))
			this.socket.on('users', $.proxy(this.renderUsers, this));
		},

		mentionUser : function(event){
			var user = $(event.currentTarget).data('user'),
				$input = $('#message-input');

			$input.insertAtCaret(' @' + user + ' ');
		},

		renderUsers : function(users){
			var $list = $('<ul />'),
				self = this;

			$.each(users, function(i, user){
				$list.append('<li data-user="'+user.name+'"><img src="http://gravatar.com/avatar/' + user.id +'" /><span></span></li>');
			});

			$('#user-list').html($list);
		},

		renderMessage : function(message){
			message.message = jQuery('<div/>').text(message.message).html();
			message.message = replaceURLWithHTMLLinks(message.message);
			message.message = message.message.replace(/\r?\n|\r/g, "<br>");

			if(this.lastMessage && this.lastMessage.user === message.user){
				this.$lastMessage.find('.message-body').append('<div>' + message.message + '</div>');
			} else {
				this.$lastMessage = $(this.templates.message({ message: message }));
				$('#messages').append(this.$lastMessage);
			}

			$('#messages').stop().animate({ scrollTop: $('#messages')[0].scrollHeight + 30 }, 200);
			
			if(message.time >= this.lastActive && message.name !== this.user.name && (message.user !== this.lastMessage.user || message.user === this.lastMessage.user && message.time > this.lastActive && this.notifications.indexOf(message.user) < 0)){

				this.notifications.push(message.user);
				Tinycon.setBubble(this.notifications.length);
				this.$lastMessage.addClass("new");
			}
			
			this.lastMessage = message;
		},

		renderTyping : function(types){
			clearTimeout(this.typingTimer);

			if(types.name === this.user.name){
				return;
			}

			$('#typing-info').html(types.name + " is typing…");

			this.typingTimer = setTimeout(function(){
				$('#typing-info').html("");
			}, 500);
		},
	});


	new App.Views.Main();
})();