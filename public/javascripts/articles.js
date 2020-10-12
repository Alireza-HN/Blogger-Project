//client-side input validator
import {VALIDATOR} from './input-validator-client.js';

export const ARTICLE = {add_avatar_to_article};

// *********************************************************************************
//                            TinyMCE Config (Text Editor)
// *********************************************************************************

tinymce.init({
    selector: '#article-sheet',

    plugins: 'autoresize wordcount',
    toolbar: 'undo redo | styleselect | bold italic | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | wordcount',

    autoresize_overflow_padding: 10,
    max_height: 1000,
    min_height: 480,

    auto_focus : "article-sheet",

    init_instance_callback: function () {  
        $("#loading-article").css("display", "none");
        $("#article-container form").css("display", "block");
    },

    add_unload_trigger : true,   //text remains in editor if page unloaded

    setup: function (editor) 
    {
        editor.on('change', function () {
            editor.save();
        });
    }
});


// *****************************************************
//              Characters and Words Cont
// *****************************************************

//Returns text statistics for the specified editor by id, also counts HTML tags
function get_stats(id) 
{
    let body = tinymce.get(id).getBody();
    let text = tinymce.trim(body.innerText || body.textContent);    

    //just return number of characters
    return {
        chars: text.length
        // words: text.split(/[\w\u2019\'-]+/).length
    }
}



// *********************************************************************************
//                              save article to database
// *********************************************************************************

$("#publish-btn").on("click", function (event) 
{ 
    //don't reload page on Submit
    event.preventDefault();

    // *****************************************************
    //                  Character Limit
    // *****************************************************

    //if characters of the article are less than 300
    if (get_stats('article-sheet').chars < 300){
        $("#error-alert-article").show();
        $("html").scrollTop(300);
        return $("#error-alert-article").html("<b>Min</b> characters allowed is <b>300</b>");
    }
    else {
        $("#error-alert-article").hide();
    }

    //if characters of the article are more than 10000
    if (get_stats('article-sheet').chars > 10000){
        $("#error-alert-article").show();
        $("html").scrollTop(300);
        return $("#error-alert-article").html("<b>Max</b> characters allowed is <b>10000</b>");
    }
    else {
        $("#error-alert-article").hide();
    }


    // *****************************************************
    //                 Add Summary of Article
    // *****************************************************

    //open summary panel
    $("#summary-modal-btn").trigger("click");

    let char_count = 0;

    //count summary characters
    $("#summary-sheet").keyup(function () 
    { 
        char_count = $(this).val().length;

        $("#char-count span").text(char_count);
        
        if (char_count > 400) {
            $("#char-count").css("color", "red");
        }
        else {
            $("#char-count").css("color", "black");
        }
    });

    
    //check summary characters and send to the server
    $("#expose-btn").click(function () 
    { 
        if (char_count < 100) {
            $("#error-alert-summary").show();
            $("#error-alert-summary").html("<b>Min</b> characters allowed is <b>100</b>");
        }

        else if (char_count > 400) {
            $("#error-alert-summary").show();
            $("#error-alert-summary").html("<b>Max</b> characters allowed is <b>400</b>");
        }

        else {
            $("#error-alert-summary").hide();
            save_article();
        }
    });
});


// *****************************************************
//              send article to the server
// *****************************************************

function save_article() 
{  
    //article parts
    let article = {
        content: $("#article-sheet").val(),
        title: $("#article-title").val(),
        summary: $("#summary-sheet").val()
    }

    changes_for_article_publish("is-loading");


    $.ajax(
    {
        type: "POST",
        url: "/article",
        data: article,

        success: function (result, status, xhr) 
        {
            alert("Article published successfully.")

            //hide loading
            changes_for_article_publish("not-loading");

            //close the panel
            $(".summary-close-btns").trigger("click");


            //open the add photo panel
            $("#article-photo-modal-btn").trigger("click");

            //diselect chosen photo
            document.getElementById("file-input-container").reset()
        },

        error: function (xhr, status, error) 
        {
            //session timed out
            if (xhr.status === 403) {
                window.location.assign('/signin');
            }

            //server error
            else if (xhr.status === 500) {
                alert("Something went wrong in saving article! Try again.");
                changes_for_article_publish("not-loading");
            }
        }
    });
}


// *****************************************************
//                 add avatar to article
// *****************************************************

$("#file-input").on("click", function () 
{
    //validate selected photo and send to the server 
    //(with exporting 'add_avatar_to_article' function)
    VALIDATOR.avatar("article");
});

$("#skip-btn").on("click", function () 
{ 
    //*******************************************************************************
    //should go to articles page
    //*******************************************************************************
    window.location.assign('/user/dashboard');
});


function add_avatar_to_article() 
{  
    //make a form data for sending image to ther server
    let form_data = new FormData();
    let avatar = document.getElementById("file-input").files[0];
    form_data.append('avatar', avatar);

    
    $.ajax({
        type: "PUT",
        url: "/article/avatar",
        data: form_data,
        contentType: false,
        processData: false,

        success: function (result, status, xhr) 
        {
            //changes were successful
            alert("Article avatar changed successfully.");

            changes_for_article_avatar("not-loading");

            //close the change photo panel
            $(".photo-close-btns").trigger("click");   

            //*******************************************************************************
            //should go to articles page
            //*******************************************************************************
            window.location.assign('/user/dashboard');
        },

        //show error in alert-box
        error: function (xhr, status, error) 
        {
            //session timed out
            if (xhr.status === 403) {
                alert("You should sign-in again.")
                window.location.assign('/signin');
            }

            //server error
            else if (xhr.status === 500) {
                changes_for_photo_change("not-loading");
                alert("Something went wrong in saving avatar! Try again.");
            }
        }
    }); 
}

// *********************************************************************************
//                               Appearance changes
// *********************************************************************************

//hiding and showing buttons and boxes when 'expose' button is clicked
//for password change
function changes_for_article_publish (status) 
{
    if (status === "is-loading")
    {
        //hide error box and buttons
        $("#error-alert-summary").hide();    
        $("#expose-btn").hide();  
        $(".summary-close-btns").hide();

        //show loading
        $("#loading-summary").show();
    }

    else if ("not-loading")
    {
        //hide loading
        $("#loading-summary").hide();
                    
        //show buttons
        $(".summary-close-btns").show();
        $("#expose-btn").show();
    }
}


//hiding and showing buttons and boxes when 'expose' button is clicked
//for password change
function changes_for_article_avatar (status) 
{
    // if (status === "is-loading")
    // {
    //     //hide error box and buttons
    //     $("#error-alert-summary").hide();    
    //     $("#expose-btn").hide();  
    //     $(".summary-close-btns").hide();

    //     //show loading
    //     $("#loading-summary").show();
    // }

    // else if ("not-loading")
    // {
    //     //hide loading
    //     $("#loading-summary").hide();
                    
    //     //show buttons
    //     $(".summary-close-btns").show();
    //     $("#expose-btn").show();
    // }
}