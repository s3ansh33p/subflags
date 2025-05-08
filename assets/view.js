CTFd._internal.challenge.data = undefined;

CTFd._internal.challenge.preRender = function() {};

CTFd._internal.challenge.postRender = async function() {
    // delay
    await new Promise(resolve => setTimeout(resolve, 100));
    // assigns ids to the original html hint element 
    assign_hint_ids();
    // insert the subflags into the view
    insert_subflags();
}

// assigns ids to the original html hint element
function assign_hint_ids(){
    // identifies the hint div by class
    let hints = document.getElementsByClassName("col-md-12 hint-button-wrapper text-center mb-3");
    let len = hints.length
    for (let i = 0; i < len; i++) {
        // gets the hint id from the custom "data-hint-id" attribute
        let hint_id = "hint_" + hints[i].children[0].getAttribute("data-hint-id")
        // sets the attribute id to the hint id
        hints[i].setAttribute('id', hint_id);
    }
}

// inserts the subflags into the view
function insert_subflags(){
    // gets the challenge id from the CTFd lib
    let challenge_id = parseInt(CTFd.lib.$('#challenge-id').val())

    // gets the info needed for the subflag view from the api endpoint
    CTFd.fetch(`/api/v1/subflags/challenges/${challenge_id}/view`, {
            method: "GET"
        })
        .then((response) => response.json())
        .then((data) => {

        // creates an array of subflag ids and sorts them according to their order
        let order_array = [];
        Object.keys(data).forEach(key => {
            order_array.push(key)
        });
        order_array.sort(function(a,b){
            return data[a]["order"] - data[b]["order"];
        });

        // insert subflags headline if at least one subflag exists
        if (order_array.length > 0) {
            CTFd.lib.$("#subflags").append("<h5 class='mt-4'>Subflags:</h5>");
        }
        

        // goes through the list of subflag ids
        for (let i = 0; i < order_array.length; i++) {
            // temp subflag variables (id, desc, whether the subflag is solved by the current team)
            let id = order_array[i];
            let desc = data[id].desc;
            let placeholder = data[id].placeholder;
            let points = data[id].points;
            let subflag_solved_by_me = data[id].solved;

            if (!placeholder) {
                placeholder = "Submit subflag for extra awards.";
            }

            // if the subflag is already solved -> insert a disabled form field and an delete button 
            if (subflag_solved_by_me) {
                var keys = `<form id="subflag_form` + id + `">
                        <p class="form-text">
                            ` + desc + `
                            | Points:  <b>+` + points + `</b>
                        </p> 
                        <div class="row" style="margin-bottom: 10px;">
                            <div class="col-md-12">
                                <input type="text" class="form-control chal-subflag_key" name="answer" placeholder="Subflag Solved!" disabled>
                            </div>
                            
                        </div>
                    </form>
                    <div id="subflag_hints_` + id + `"> </div>`;
            // if the subflag is not yet solved -> insert a formfield with a submit button
            // note: text-light is a theme specific change, remove or edit as needed
            } else {
                var keys = `<form id="subflag_form` + id + `" onsubmit="submit_subflag(event, ${id})" class="my-2">
                    <p class="form-text">
                        ` + desc + `
                        | Points:  <b>+` + points + `</b>
                    </p>
                    <div class="row">
                        <div class="col-md-8 form-group">
                            <input type="text" class="form-control chal-subflag_key" name="answer" placeholder="` + placeholder + `" required>
                        </div>
                        <div class="col-md-4 form-group" id=submit>
                            <input type="submit" value="Submit" class="btn btn-md btn-outline-secondary text-light float-right w-100">
                        </div>
                    </div>
                </form>
                <div id="subflag_hints_` + id + `"> </div>`;
          }      
          CTFd.lib.$("#subflags").append(keys);      
          
          // creates an array of hint ids and sorts them according to their order
          let hintdata = [];
          Object.keys(data[id].hints).forEach(key => {
              hintdata.push(key);
          });
          hintdata.sort(function(a,b){
              return data[id].hints[a].order - data[id].hints[b].order;
          });
          
          // calls a function to move the hints to the according position
          move_subflag_hints(id, hintdata);
        }
        // include headline for main flag at the end
        if (order_array.length > 0) {
            CTFd.lib.$("#subflags").append("<h5 class='mt-4'>Main Flag:</h5>");
        }
    });
}

// moves the original hint html element to the right position beneath the subflag
// input: subflag id, hintdata: array of hint ids
function move_subflag_hints(subflag_id, hintdata) {
    for (let i = 0; i < hintdata.length; i++) {
        // move the element
        document.getElementById("subflag_hints_" + subflag_id).appendChild( document.getElementById("hint_" + hintdata[i]) );
    }  
}

// function to submit a subflag solution (gets called when the player presses submit)
// input: form event containing: subflag id, answer
function submit_subflag(event, subflag_id) {
    event.preventDefault();
    const params = Object.fromEntries(new FormData(event.target).entries());

    // calls the api endpoint to attach a hint to a subflag
    CTFd.fetch(`/api/v1/subflags/solve/${subflag_id}`, {
      method: "POST",
      body: JSON.stringify(params)
  })
      .then((response) => response.json())
      .then((data) => {
          if (data.data.solved) {
              location.reload();
          }
          else {
              console.log(data);
              alert("wrong answer!");
          }
      });
}

// function to delete a correct subflag answer
// input: subflag id
function delete_subflag_submission(subflag_id){
    // calls the api endpoint to post a solve attempt to a subflag
    CTFd.fetch(`/api/v1/subflags/solve/${subflag_id}`, {
        method: "DELETE"
    })
        .then((response) => response.json())
        .then((data) => {
            if (data.success) {
                location.reload();
            }
            else {
                console.log(data);
                alert("wrong answer!");
            }
        });
}

CTFd._internal.challenge.submit = function (preview) {
    var challenge_id = parseInt(CTFd.lib.$('#challenge-id').val())
    var submission = CTFd.lib.$('#challenge-input').val()

    var body = {
        'challenge_id': challenge_id,
        'submission': submission,
    }
    var params = {}
    if (preview) {
        params['preview'] = true
    }

    return CTFd.api.post_challenge_attempt(params, body).then(function (response) {
        if (response.status === 429) {
            // User was ratelimited but process response
            return response
        }
        if (response.status === 403) {
            // User is not logged in or CTF is paused.
            return response
        }
        return response
    })
};
