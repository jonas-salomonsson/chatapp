var accountInfo = {};

var eventStreamInfo = {
    from: "END"
};

var roomInfo = [];
var memberInfo = [];
var viewingRoomId;

var host = "https://synapse.cynergit.nu";
var isSetup = false;
var user = "";
var botname = "";

function init(cfg_host, cfg_user, cfg_pass, cfg_botname) {
    host = cfg_host;
    user = cfg_user;
    botname = cfg_botname;
    isSetup = true;

    $("#chatApp").append(getMessageWrapper());
    $("#chatApp").append(getInputForm());

    login(cfg_user, cfg_pass);
    //console.log("Using bot: " + cfg_botname);
};

function getMessageWrapper() {
    var $messageWrapper = $("<div></div>").attr({ "class": "messageWrapper" });
    var $messagesDiv = $("<div></div>").attr({ "id": "messages" });
    return $messageWrapper.append($messagesDiv);
};

function getInputForm() {
    var $inputForm = $("<form></form>");
    $inputForm.attr({ "class": "sendMessageForm" });
    var $inputText = $("<input></input>");
    $inputText.attr({
        "type": "text",
        "class": "textEntry",
        "id": "body",
        "placeholder": "Enter text here...",
        "onkeydown": "javascript:if (event.keyCode == 13) document.getElementById('sendMsg').focus()"
    });
    var $inputButton = $("<button></button>");
    $inputButton.attr({
        "type": "button",
        "class": "sendMessage",
        "id": "sendMsg"
    }).text('Send');
    $inputForm.append($inputText);
    $inputForm.append($inputButton);
    return $inputForm;
};


$('#chatAppInit').on('click', '.setup', function() {
    init('https://synapse.cynergit.nu', 'clientBot', 'botPassword', 'mybot');
});

var leaveRoom = function(name) {
    var url = host + "/_matrix/client/api/v1/rooms/" + name + "/leave?access_token=" + accountInfo.access_token;

    $.ajax({
        url: url,
        type: "POST",
        contentType: "application/json; charset=utf-8",
        success: function(data) {
            if(data==={}) {
                //console.log("Left room: " + name);
                getCurrentRoomList();
            }
        },
        error: function(err) {
            alert("Unable to leave room: is the homeserver running?");
        }
    });
};

$('#chatApp').on('click', '.leaveRoom', function() {
    leaveRoom(viewingRoomId);
});

$('#chatApp').on('click', '.inviteBot', function() {
    inviteUserToCurrentRoom(viewingRoomId, '@goneb:synapse.cynergit.nu');
});

$('#chatApp').on('click', '.inviteUser', function() {
    inviteUserToCurrentRoom(viewingRoomId);
});

var inviteUserToCurrentRoom = function(room_id, user_id) {
    if(!user_id) {
        user_id = $('#userNameToInvite').val();
    }
    var url = host + "/_matrix/client/api/v1/rooms/" + room_id + "/invite?access_token=" + accountInfo.access_token;
    var data = JSON.stringify({ user_id: user_id });

    $.ajax({
        url: url,
        data: data,
        type: "POST",
        contentType: "application/json; charset=utf-8",
        success: function(data) {
            if(data==={}) {
                //console.log("Invited: " + user_id + " to room: " + room_id);
            }
        },
        error: function(err) {
            alert("Unable to invite user to room: is the homeserver running?");
        }
    });
};

var longpollEventStream = function() {
    var url = host + "/_matrix/client/api/v1/events?access_token=$token&from=$from";
    url = url.replace("$token", accountInfo.access_token);
    url = url.replace("$from", eventStreamInfo.from);

    $.getJSON(url, function(data) {
        eventStreamInfo.from = data.end;

        var hasNewLatestMessage = false;
        var updatedMemberList = false;
        var i=0;
        var j=0;
        for (i=0; i<data.chunk.length; ++i) {
            if (data.chunk[i].type === "m.room.message") {
                //console.log("Got new message: " + JSON.stringify(data.chunk[i]));
                if (viewingRoomId === data.chunk[i].room_id) {
                    addMessage(data.chunk[i]);
                }

                for (j=0; j<roomInfo.length; ++j) {
                    if (roomInfo[j].room_id === data.chunk[i].room_id) {
                        roomInfo[j].latest_message = data.chunk[i].content.body;
                        hasNewLatestMessage = true;
                    }
                }
            }
            else if (data.chunk[i].type === "m.room.member") {
                if (viewingRoomId === data.chunk[i].room_id) {
                    //console.log("Got new member: " + JSON.stringify(data.chunk[i]));
                    addMessage(data.chunk[i]);
                    for (j=0; j<memberInfo.length; ++j) {
                        if (memberInfo[j].state_key === data.chunk[i].state_key) {
                            memberInfo[j] = data.chunk[i];
                            updatedMemberList = true;
                            break;
                        }
                    }
                    if (!updatedMemberList) {
                        memberInfo.push(data.chunk[i]);
                        updatedMemberList = true;
                    }
                }
                if (data.chunk[i].state_key === accountInfo.user_id) {
                    getCurrentRoomList(); // update our join/invite list
                }
            }
            else {
                //console.log("Discarding: " + JSON.stringify(data.chunk[i]));
            }
        }

        if (hasNewLatestMessage) {
           setRooms(roomInfo);
        }
        if (updatedMemberList) {
            $("#members").empty();
            for (i=0; i<memberInfo.length; ++i) {
                addMember(memberInfo[i]);
            }
        }
        longpollEventStream();
    }).fail(function(err) {
        setTimeout(longpollEventStream, 5000);
    });
};

var onLoggedIn = function(data) {
    accountInfo = data;
    longpollEventStream();
    getCurrentRoomList();
    $("#chatApp").css({ display: "inline-block"});
    $(".roomListDashboard").css({ display: "inline-block"});
    $(".roomContents").css({ display: "inline-block"});
    $(".inviteBot").css({ display: "inline-block" });
    $("#userNameToInvite").css({ display: "inline-block" });
    $(".inviteUser").css({ display: "inline-block" });
    $(".leaveRoom").css({ display: "inline-block" });
    $(".signUp").css({display: "none"});
    if (isSetup) {
        var roomName = user+(new Date().getMilliseconds().toString());
        //console.log("Creating room: "+roomName);
        cRoom(roomName);
        isSetup = false;
    }
};

var login = function(user, password) {
    //host = $("#hostAddress").val();
    var url = host + "/_matrix/client/api/v1/login";
    //console.log("host: " + host + " url: " + url);
    $.ajax({
        url: url,
        type: "POST",
        contentType: "application/json; charset=utf-8",
        data: JSON.stringify({ user: user, password: password, type: "m.login.password" }),
        dataType: "json",
        success: function(data) {
            onLoggedIn(data);
        },
        error: function(err) {
            alert("Unable to login: is the homeserver running?");
        }
    });
};

$('#chatApp').on('click', '.login', function() {
    var user = $("#userLogin").val();
    var password = $("#passwordLogin").val();
    login(user, password);
});

var register = function() {
    //host = $("#hostAddress").val();
    var user = $("#userReg").val();
    var password = $("#passwordReg").val();
    var url = host + "/_matrix/client/api/v1/register";
    //console.log("host: " + host + " url: " + url);
    $.ajax({
        url: url,
        type: "POST",
        contentType: "application/json; charset=utf-8",
        data: JSON.stringify({ user: user, password: password, type: "m.login.password" }),
        dataType: "json",
        success: function(data) {
            onLoggedIn(data);
        },
        error: function(err) {
            var msg = "Is the homeserver running?";
            var errJson = $.parseJSON(err.responseText);
            if (errJson !== null) {
                msg = errJson.error;
            }
            alert("Unable to register: "+msg);
        }
    });
};

$('#chatApp').on('click', '.register', function() {
    register();
});

var cRoom = function(roomAlias) {
    var data = {};
    if (roomAlias.length > 0) {
        data.room_alias_name = roomAlias;
    }
    $.ajax({
        url: host + "/_matrix/client/api/v1/createRoom?access_token="+accountInfo.access_token,
        type: "POST",
        contentType: "application/json; charset=utf-8",
        data: JSON.stringify(data),
        dataType: "json",
        success: function(response) {
            $("#roomAlias").val("");
            response.membership = "join"; // you are automatically joined into every room you make.
            response.latest_message = "";

            roomInfo.push(response);
            setRooms(roomInfo);
            loadRoomContent(response.room_id);
            inviteUserToCurrentRoom(viewingRoomId, '@goneb:synapse.cynergit.nu');
        },
        error: function(err) {
            alert(JSON.stringify($.parseJSON(err.responseText)));
        }
    });
};

var createRoom = function() {
    var roomAlias = $("#roomAlias").val();
    cRoom(roomAlias);
};

$('#chatApp').on('click', '.createRoom', function() {
    createRoom();
});

var getCurrentRoomList = function() {
    var url = host + "/_matrix/client/api/v1/initialSync?access_token=" + accountInfo.access_token + "&limit=1";
    $.getJSON(url, function(data) {
        var rooms = data.rooms;
        for (var i=0; i<rooms.length; ++i) {
            if ("messages" in rooms[i]) {
                rooms[i].latest_message = rooms[i].messages.chunk[0].content.body;
            }
        }
        roomInfo = rooms;
        setRooms(roomInfo);
    }).fail(function(err) {
        alert(JSON.stringify($.parseJSON(err.responseText)));
    });
};

var loadRoomContent = function(roomId) {
    //console.log("loadRoomContent " + roomId);
    viewingRoomId = roomId;
    $("#roomName").text("Room: "+roomId);
    $(".sendMessageForm").css({ display: "block" });
    getMessages(roomId);
    getMemberList(roomId);
};

var getMessages = function(roomId) {
    $("#messages").empty();
    var url = host + "/_matrix/client/api/v1/rooms/" +
              encodeURIComponent(roomId) + "/messages?access_token=" + accountInfo.access_token + "&from=END&dir=b&limit=10";
    $.getJSON(url, function(data) {
        for (var i=data.chunk.length-1; i>=0; --i) {
            addMessage(data.chunk[i]);
        }
    });
};

var getMemberList = function(roomId) {
    $("#members").empty();
    memberInfo = [];
    var url = host + "/_matrix/client/api/v1/rooms/" +
              encodeURIComponent(roomId) + "/members?access_token=" + accountInfo.access_token;
    $.getJSON(url, function(data) {
        for (var i=0; i<data.chunk.length; ++i) {
            memberInfo.push(data.chunk[i]);
            addMember(data.chunk[i]);
        }
    });
};

$('#chatApp').on('click', '.sendMessage', function() {
    if (viewingRoomId === undefined) {
        alert("There is no room to send a message to!");
        return;
    }
    var body = $("#body").val();
    sendMessage(viewingRoomId, body);
});

var sendMessage = function(roomId, body) {
    var msgId = $.now();

    var url = host + "/_matrix/client/api/v1/rooms/$roomid/send/m.room.message?access_token=$token";
    url = url.replace("$token", accountInfo.access_token);
    url = url.replace("$roomid", encodeURIComponent(roomId));

    var data = {
        msgtype: "m.text",
        body: body
    };

    $.ajax({
        url: url,
        type: "POST",
        contentType: "application/json; charset=utf-8",
        data: JSON.stringify(data),
        dataType: "json",
        success: function(data) {
            $("#body").val("");
            $(".messageWrapper").stop().animate({ scrollTop: $(".messageWrapper")[0].scrollHeight}, 1000);
            document.getElementById('body').focus()
        },
        error: function(err) {
            alert(JSON.stringify($.parseJSON(err.responseText)));
        }
    });
};

var setRooms = function(roomList) {
    $("#rooms").find("tr:gt(0)").remove();

    var rows = "";
    for (var i=0; i<roomList.length; ++i) {
        row = "<tr>" +
              "<td>"+roomList[i].room_id+"</td>" +
              "<td>"+roomList[i].membership+"</td>" +
              "<td>"+roomList[i].latest_message+"</td>" +
              "</tr>";
        rows += row;
    }

    $("#rooms").append(rows);

    $('#rooms').find("tr").click(function(){
        var roomId = $(this).find('td:eq(0)').text();
        var membership = $(this).find('td:eq(1)').text();
        if (membership !== "join") {
            //console.log("Joining room " + roomId);
            var url = host + "/_matrix/client/api/v1/rooms/$roomid/join?access_token=$token";
            url = url.replace("$token", accountInfo.access_token);
            url = url.replace("$roomid", encodeURIComponent(roomId));
            $.ajax({
                url: url,
                type: "POST",
                contentType: "application/json; charset=utf-8",
                data: JSON.stringify({membership: "join"}),
                dataType: "json",
                success: function(data) {
                    loadRoomContent(roomId);
                    getCurrentRoomList();
                },
                error: function(err) {
                    alert(JSON.stringify($.parseJSON(err.responseText)));
                }
            });
        }
        else {
            loadRoomContent(roomId);
        }
    });
};

var addMessage = function(data) {

    var msg = data.content.body;
    if (data.type === "m.room.member") {
        if (data.content.membership === undefined) {
            return;
        }
        if (data.content.membership === "invite") {
            msg = "<em>invited " + data.state_key + " to the room</em>";
        }
        else if (data.content.membership === "join") {
            msg = "<em>joined the room</em>";
        }
        else if (data.content.membership === "leave") {
            msg = "<em>left the room</em>";
        }
        else if (data.content.membership === "ban") {
            msg = "<em>was banned from the room</em>";
        }
    }
    if (msg === undefined) {
        return;
    }

    var row =   "<div class='message'>" +
                "<div class='userDiv'>" + data.user_id + "</div>" +
                "<div class='msgDiv'>" + msg + "</div>" +
                "</div>";
    $("#messages").append(row);
};

var addMember = function(data) {
    var row = "<div class='memberBlock'>" +
              "<div class='memberState'>"+data.state_key+"</div>" +
              "<div class='memberMembership>"+data.content.membership+"</div>" +
              "</div>";
    $("#members").append(row);
};