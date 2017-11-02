![Logo of the project](https://cdn.zapier.com/storage/photos/b40533aae8f4d19588c1fe3c034bf0fd.png)

# CGI Chat app
> Getting support has never been so easy

This is a chat client that should be used in conjunction with a matrix server backend and embedded on a webpage.

## Installing / Getting started

To get started you need to add a div with id="chatApp" on your page. 
You also need a button with class="setup" to use a predefined set of configuration for testing. 

Using the predefined event will log on to https://synapse.cynergit.nu with a predefined user and invite 
the bot @goneb:synapse.cynergit.nu

For production use you need to initialize the chatApp by calling the init() function.

Also link to jquery 3.2.1, style.css and chatapp.css

init() signature: init(cfg_host, cfg_user, cfg_pass, cfg_botname)
cfg_host: the address for the backend server
cfg_user: the username to be used
cfg_pass: the password for the user
cfg_botname: the name of the bot to invite

```shell
npm install
```

This will download the module and dependencies, for the moment jquery is the only one.

## Developing

If you would like to help developing this project:

```shell
git clone https://github.com/jonas-salomonsson/chatapp.git
cd chatapp/
npm install
```

Make modifications to the scss or js file as you wish.
build scss:

```shell
sass chatapp.scss chatapp.css
```

## Features

The main features of this simple chat client are:
* Connect to a matrix homeserver of your choice
* Login with a already registered user.
* There's also methods prepared for a meatier client that supports registering a user, showing rooms and room members etc.

## Configuration

Send the following parameters to the init() function:
cfg_host: the address for the backend server
cfg_user: the username to be used
cfg_pass: the password for the user
cfg_botname: the name of the bot to invite

#### cfg_host
Type: `String`  
Default: There's no default value unless you use the prepared event for on('click', '.setup', function()...)

This should be the address to you'r homeserver. https://synapse.cynergit.nu 

#### cfg_user
Type: `String`  

An example matrix username looks like this: @username:domain.com

#### cfg_pass
Type: `String`  

Password for the user.

#### cfg_botname
Type: `String`

Username of the bot or user to invite to the room that will be automatically created for you.

## Contributing

"If you'd like to contribute, please fork the repository and use a feature
branch. Pull requests are warmly welcome."

## Licensing

"The code in this project is licensed under MIT license."
