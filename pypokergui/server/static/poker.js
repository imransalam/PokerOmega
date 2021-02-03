/*
 *  Register callback functions on buttons.
 */
$(document).ready(function() {
    if (!window.console) window.console = {};
    if (!window.console.log) window.console.log = function() {};

    $(document).on('click', "#config_form_submit", function(e) {
       updateConfig();
        e.preventDefault();
    });

    $(document).on('click', "#registration_form_submit", function(e) {
        registerPlayer();
        e.preventDefault();
    });

    $(document).on('change', "[name='dealer_name']", function(e){
        assignDealer(e);
        e.preventDefault();
    });

    $("#start_game_form").on("submit", function() {
        startGame()
        return false;
    });
    //
    // const updater2 = { ...updater};
    // updater1
});

function callbackClosureWithArgument(i, callback) {
  return function(event) {
    return callback(i, event);
  }
}

function callbackClosure(i, j, callback) {
  return function() {
    return callback(i, j);
  }
}

let delay = ms => new Promise(r => setTimeout(r, ms));

/*
 *  Callback function invoked when
 *  player is assigned as a dealer.
 */
async function assignDealer(e) {
    var message = { };
    message['type'] = "assign_dealer";
    message['dealer_name'] = e.target.value;
    console.log(e.target.value)

    if (!updater.sockets[0]) {
        alert('Add one human player to assign dealer.')
        return;
    }
    updater.sockets[0].send(JSON.stringify(message));
}

/*
 *  Callback function invoked when
 *  human player is registered.
 */
async function registerPlayer(e) {
    var message = $('#registration_form').formToDict();
    message['type'] = "action_new_member"
    message['name'] = $('#player_name').val();
    message['player_type'] = $('#player_type_select').val();
    delete message.body
    updater.start(message['name']);
    while (updater.sockets[updater.sockets.length - 1].readyState === 0) {
        await delay(1000)
    }
    updater.sockets[updater.sockets.length - 1].send(JSON.stringify(message));
}

/*
 *  Callback function invoked when
 *  config is updated.
 */
function updateConfig() {
    var message = $("#config_form").formToDict();
    message['type'] = "update_config"
    message['max_round'] = $("#max_round").val()
    message['initial_stack'] = $("#initial_stack").val()
    message['small_blind'] = $("#small_blind").val()
    message['ante'] = $("#ante").val()
    message['ai_players'] = $("#ai_players").val()

    if (!updater.sockets[0]) {
        alert('Add one human player to update rules.')
        return ;
    }
    updater.sockets[0].send(JSON.stringify(message));
}

/*
 * Callback function invoked when
 * game is started.
 */
async function startGame() {
    console.log("Start Game");
    message = {};
    message['type'] = "action_start_game";
    // message['dealer_name'] = e.target.value;
    //
    // if(e.target.value === ""){
    //     alert('Assign a Dealer to continue');
    //     return;
    // }

    if (!updater.sockets[0]) {
        alert('No Human Player is added');
        return;
    }
    updater.sockets[0].send(JSON.stringify(message));
}

function restartGame() {
    console.log("Restart Game")
    message = {}
    message['type'] = "action_restart_game"
    updater.sockets[1].send(JSON.stringify(message));
    location.reload()
}

/*
 * Callback function invoked when
 * human player declared his action in the game.
 */
const declareAction = (form, socket, socketNumber) => {
  console.log("Declare Action")
  var message = form.formToDict();
  message['type'] = "action_declare_action";
  let nextPlayer = $('#next_player_span').text().trim();

    console.log(updater.nameToSocketMap[nextPlayer])
  updater.sockets[updater.nameToSocketMap[nextPlayer]].send(JSON.stringify(message))
}

/*
 * Helper function to get form information as hash.
 */
jQuery.fn.formToDict = function() {
    var fields = this.serializeArray();
    var json = {}
    for (var i = 0; i < fields.length; i++) {
        json[fields[i].name] = fields[i].value;
    }
    if (json.next) delete json.next;
    return json;
};

/*
 *  This object setups and holds websocket.
 */
var updater = {
    sockets: [],
    lastTurn: 0,
    nameToSocketMap: {},

    /*
     *  This method is invoked when index page is opened.
     *  Setup websocket and register callback method on it.
     *  URL would be "ws://localhost/pokersocket:8888".
     */
    start: function(player) {
            let url = "ws://" + location.host + "/pokersocket";
            let socketNumber = updater.sockets.length;
            updater.sockets[socketNumber] = new WebSocket(url);

            updater.nameToSocketMap = { ...updater.nameToSocketMap, [player]: socketNumber }

            updater.sockets[socketNumber].onmessage = (event) => {
                message = JSON.parse(event.data)
                if ('config_update' == message['message_type']) {
                    updater.updateConfig(message)
                } else if ('start_game' == message['message_type']) {
                    updater.startGame(message, event.target, socketNumber);
                } else if ('restart_game' == message['message_type']) {
                    updater.restartGame(message)
                } else if ('update_game' == message['message_type']) {
                    updater.updateGame(message)
                } else if ('alert_restart_server' == message['message_type']) {
                    updater.alert_restart_server(message)
                } else {
                    window.console.error("received unexpected message: " + message)
                }
            }
    },

    /*
     * Invoked when received the new message
     * about update of config like new member is registered.
     */
    updateConfig: function(message) {
        var node = $(message.html);
        $("#config_box").html(node)
        if (message.registered) {
          $("#registration_form input[type=submit]").prop("disabled", true);
        }
    },

    /*
     * Invoked when received the message
     * about start of the game.
     */
    startGame: (message, socket, socketNumber) => {
      var node = $(message.html);
      $("#container").html(node)
      $("#declare_action_form").hide()
      $("#declare_action_form").on("submit", () => {
        declareAction($("#declare_action_form"), socket, socketNumber);
        return false;
      });
      $("#start_game_form").on("submit", function() {
          startGame()
          return false;
      });
      $("#restart_game_form").on("submit", function() {
          restartGame()
          return false;
      });
    },



    restartGame: function(message) {
      // var node = $(message.html)
      // $("#container").html(node)
      // $("#declare_action_form").hide()
      // $("#declare_action_form").on("submit", function() {
      //   declareAction($(this));
      //   return false;
      // });
      console.log("Reached the RESTART function")
      location.reload()
    },

    /*
     * Invoked when received the message about
     * new event of the game like "new round will start".
     */
    updateGame: function(message) {
        $("#declare_action_form").hide()
        content = message['content']
        window.console.log("updateGame: " + JSON.stringify(content))
        message_type = content['update_type']
        if ('round_start_message' == message_type) {
          updater.roundStart(content.event_html)
        } else if ('street_start_message' == message_type) {
          updater.newStreet(content.table_html, content.event_html)
        } else if ('game_update_message' == message_type) {
          updater.newAction(content.table_html, content.event_html)
       } else if ('round_result_message' == message_type) {
         updater.roundResult(content.table_html, content.event_html)
       } else if ('game_result_message' == message_type) {
         updater.gameResult(content.event_html)
       } else if ('ask_message' == message_type) {
         $("#declare_action_form").show()
         updater.askAction(content.table_html, content.event_html)
       } else {
          window.console.error("unexpected message in updateGame: " + content)
       }
    },

    roundStart: function(event_html) {
      $("#event_box").html($(event_html))
    },

    newStreet: function(table_html, event_html) {
      $("#table").html($(table_html))
      $("#event_box").html($(event_html))
    },

    newAction: function(table_html, event_html) {
      $("#table").html($(table_html))
      $("#event_box").html($(event_html))
    },

    roundResult: function(table_html, event_html) {
      $("#table").html($(table_html))
      $("#event_box").html($(event_html))
    },

    gameResult: function(event_html) {
      $("#event_box").html($(event_html))
    },

    askAction: function(table_html, event_html) {
      $("#table").html($(table_html))
      $("#event_box").html($(event_html))
    },

    alert_restart_server: function(message) {
      alert(message.message)
    }

};

