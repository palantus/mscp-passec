var passwords = [];
var changes = [];
var changesFromServer = [];
var password = "";
var curBucket = "";
var lastLoadedEncryptedPasswords = [];

function init(){

	if(getUrlVar("b") != undefined){
		curBucket = getUrlVar("b");
	}

	if(curBucket){
		$("#bucketpassword").focus();

		$("#bucketpassword").keydown(function(e){
			if(e.which == 13 && $("#bucketpassword").val() != ""){
				$("#bucketpasswordok").click();
			}
		});

		$("#bucketpasswordok").click(function(){
			password = $("#bucketpassword").val();
			if(password){
				$("#bucketpasswordcontainer").hide();
				$("#bottombar").show();
				$("#addpass").show();
				load();
				sync();
				refreshPasswords();
			} else {
				alert("Please enter a password");
			}
		});

		$("#bucketpasswordshowhidechars").click(function(){
			if($("#bucketpassword").attr("type") == "password"){
				$("#bucketpassword").attr("type", "text");
				$("#bucketpasswordshowhidechars").html("Hide what you type");
			} else {
				$("#bucketpassword").attr("type", "password");
				$("#bucketpasswordshowhidechars").html("Show what you type");
			}
		});
	} else {
		$("#bucketpasswordcontainer").hide();
		$("#helptext").fadeIn("fast");
		$("#maintable").hide();
	}
	
	setTimeout(function(){
		initFunctionality();
	}, 500);
}

function initFunctionality(){

	$(document).keydown(function(e){
		var focusElement = $(":focus");
		if(focusElement.length > 0 && (focusElement[0].nodeName == "TEXTAREA" || focusElement[0].nodeName == "INPUT"))
			return;

		if(e.ctrlKey || e.shiftKey || e.altKey)
			return;

		switch(e.which){
			case 65 : // a
			case 107 : // +
				$("#addpass:visible").click();
				break;
			case 83 : // s
				$("#dosync:visible").click();
				break;
			case 84 : // t
				$("#showtrash:visible").click();
				break;
			case 76 : // l
				$("#lockbucket:visible").click();
				break;
			case 79 : // o
				$("#openbucket:visible").click();
				break;
			case 49 : // 1
			case 50 : // 2
			case 51 : // 3
			case 52 : // 4
			case 53 : // 5
			case 54 : // 6
			case 55 : // 7
			case 56 : // 8
			case 57 : // 9
				$("#maintable tr:nth-child(" + (e.which - 48) + ")").click();
				break;
			case 97 : // 1
			case 98 : // 2
			case 99 : // 3
			case 100 : // 4
			case 101 : // 5
			case 102 : // 6
			case 103 : // 7
			case 104 : // 8
			case 105 : // 9
				$("#maintable tr:nth-child(" + (e.which - 96) + ")").click();
				break;
		}
	});

	$("#openbucket").click(function(){
		var bid = prompt("Enter a bucket ID or leave empty to generate a new random ID:");
		if (bid !== null && bid !== false) { // Canceled
			if(!bid)
				bid = guid();

			window.location = "?b=" + bid;
		}
		
	});

	$("#lockbucket").click(function(){
		location.reload();
	});

	$("#addpass").click(function(){
		var popupCreator = new PopupCreator();
		popupCreator.init({
			title: "Add password",
			content:   "<table>"
						+ "<tr><td>Title: </td><td><input type='text' style='width: " + (isMobileOrNarrow() ? "100%" : "400px") + "; display: block;'></input></td></tr>"
						+ "<tr><td>Username: </td><td><input type='text' style='width: " + (isMobileOrNarrow() ? "100%" : "400px") + "; display: block;'></input></td></tr>"
						+ "<tr><td>Password: </td><td><input type='text' style='width: " + (isMobileOrNarrow() ? "100%" : "400px") + "; display: block;'></input></td></tr>"
						+ "<tr><td></td><td><div id='errormessage' style='color:red;display:none;'>Maximum length of an item is 200 characters.</div></td></tr>"
						+ "<tr><td></td><td><button id='ok' style=''>Add</button></td></tr>"
						+ "<tr><td></td><td><button id='randomizepass' style=''>Randomize password</button></td></tr>"
						+ "<tr><td></td><td><button id='cancel'>Cancel</button></td></tr>"
						+ "</table>",
			maximize: isMobileOrNarrow(),
			onShow: function(){
				var t = this;
				this.element.find("input:first").focus();

				this.element.find("input").keydown(function(e){
					if(e.which == 13 && t.element.find("input:eq(0)").val() != ""){
						t.element.find("#ok").click();
					}
				});

				this.element.find("#randomizepass").click(function(){
					t.element.find("input:eq(2)").val(Math.random().toString(36).slice(-12));
				});

				this.element.find("#ok").click(function(){
					var newTitle = t.element.find("input:eq(0)").val();
					var newUsername = t.element.find("input:eq(1)").val();
					var newPass = t.element.find("input:eq(2)").val();
					t.element.find("#errormessage").hide();
					if(newTitle && newTitle.length > 200){
						t.element.find("#errormessage").show();
						t.element.find("input").hide();
						setTimeout(function(){
							t.element.find("#errormessage").hide();
							t.element.find("input").show();
						}, 2000);
					}
					else if(newTitle){
						t.close();
						changes.push({id: guid(), type: 1, orderIdx: 1, title: newTitle, username: newUsername, password: newPass});
						onChange();
					}
				});
				this.element.find("#cancel").click(function(){
					t.close();
				});
			}
		});
		popupCreator.show();
		
	});
	
	$("#showtrash").click(function(){
		$("#trashtable").toggle();
		$("#showtrash").html($("#trashtable:visible").length > 0 ? "Hide Trash" : "Show Trash");
	});
	
	$("#dosync").click(function(){
		sync();
	});
}

function onChange(){
	save();
	load();
	refreshPasswords();
	sync();
}

function save(){
	if(changes.length <= 0 && changesFromServer.length <= 0)
		return;
	
	var encryptedPasswords = [];
	for(i in changes){
		changes[i].changeId = guid();
		var passStr = JSON.stringify(changes[i]);
		var encrypted = CryptoJS.AES.encrypt(passStr, password).toString();
		encryptedPasswords.push(encrypted);
	}

	for(i in changesFromServer){
		var passStr = JSON.stringify(changesFromServer[i]);
		var encrypted = CryptoJS.AES.encrypt(passStr, password).toString();
		encryptedPasswords.push(encrypted);
	}
	changesFromServer = [];

	if(typeof(Storage)!=="undefined"){
		var cachedBuckets = localStorage.passwords;
	} else {
		var cachedBuckets = $.cookie("passwords");
	}
	
	var found = false;
	var cachedData = [];
	if(cachedBuckets){
		cachedData = JSON.parse(cachedBuckets);
		for(i in cachedData){
			if(cachedData[i].bucketId == curBucket){
				for(c in encryptedPasswords)
					cachedData[i].data.push(encryptedPasswords[c]);
				found = true;
			}
		}
	}
	
	if(!found)
		cachedData.push({bucketId: curBucket, data: encryptedPasswords});
	
	if(typeof(Storage)!=="undefined"){
		localStorage.passwords = JSON.stringify(cachedData);
	} else {
		$.cookie("passwords", JSON.stringify(cachedData));
	}
	
	changes = [];
}

function load(){	
	if(typeof(Storage)!=="undefined"){
		passwords = localStorage.passwords;
	} else {
		passwords = $.cookie("passwords");
	}
	
	
	if(!passwords){
		passwords = [];
	} else if(typeof(passwords) === "string") {
	
		var cachedData = JSON.parse(passwords);
		var bucketData;
		for(i in cachedData)
			if(cachedData[i].bucketId == curBucket)
				bucketData = cachedData[i].data;
	
		lastLoadedEncryptedPasswords = [];

		if(!bucketData){
			passwords = [];
			return;
		}
	
		passwords = [];
		for(i in bucketData){
			try{
				var decrypted = CryptoJS.AES.decrypt(bucketData[i], password);
				decrypted = decrypted.toString(CryptoJS.enc.Utf8);
				if(decrypted.substring(0, 1) == "{"){
					passwords.push(JSON.parse(decrypted));
					lastLoadedEncryptedPasswords.push(bucketData[i]);
				}
			} catch (err){

			}
		}
	}
}

function sync(){
	request({module: "passec", message: {action: "GetBucket", bucketId: curBucket}}, function(bucket){
		$("#offline").hide();

		var localKnownIds = [];
		var serverKnownIds = [];
		for(p in passwords){
			localKnownIds.push(passwords[p].changeId);
		}

		changesFromServer = [];
		for(var i = 0; i < bucket.passwords.length; i++){
			try{
				var decrypted = CryptoJS.AES.decrypt(bucket.passwords[i], password);
				decrypted = decrypted.toString(CryptoJS.enc.Utf8);
				if(decrypted.substring(0, 1) == "{"){
					var p = JSON.parse(decrypted);
					serverKnownIds.push(p.changeId);
					if(localKnownIds.indexOf(p.changeId) < 0)
						changesFromServer.push(p)
				}
			} catch(err){

			}
		}
		
		if(changesFromServer.length > 0){
			save();
			load();
			refreshPasswords();
		}

		var passwordsToSync = [];
		for(i in localKnownIds){
			if(serverKnownIds.indexOf(localKnownIds[i]) < 0){
				var changeId = localKnownIds[i];
				var pass = null;
				for(var p = passwords.length -1; p >= 0; p--){
					if(passwords[p].changeId == changeId){
						pass = passwords[p];
						break;
					}
				}

				if(pass!= null){
					var passStr = JSON.stringify(pass);
					var encrypted = CryptoJS.AES.encrypt(passStr, password).toString();
					passwordsToSync.push(encrypted);
				}
			}
		}

		if(passwordsToSync.length > 0){
			request({module: "passec", message: {action: "SyncLocalChanges", bucketId: curBucket, passwords: passwordsToSync}}, function(res){
				$("#offline").hide();
			}, function(){$("#offline").show();});
		}
	}, function(){$("#offline").show();});
}

function refreshPasswords(){
	
	if(passwords === undefined)
		return;


	var visiblePasswords = [];
	var addedPasswordIds = [];
	var removedPasswordIds = [];

	var trashPasswords = [];
	var trashPasswordIds = [];

	var sortedPasswords = passwords.sort(function(a, b){return a.orderIdx > b.orderIdx ? 1 : -1;});

	for(var i = sortedPasswords.length - 1; i >= 0; i--){
		if((sortedPasswords[i].type == 1 || sortedPasswords[i].type == 0) && addedPasswordIds.indexOf(sortedPasswords[i].id) < 0 && removedPasswordIds.indexOf(sortedPasswords[i].id) < 0){
			visiblePasswords.push(sortedPasswords[i]);
			addedPasswordIds.push(sortedPasswords[i].id);
		} else if(sortedPasswords[i].type == -1 && removedPasswordIds.indexOf(sortedPasswords[i].id) < 0 && addedPasswordIds.indexOf(sortedPasswords[i].id) < 0){
			removedPasswordIds.push(sortedPasswords[i].id);
			addedPasswordIds.push(sortedPasswords[i].id);
		}

		if(sortedPasswords[i].type != -1 && removedPasswordIds.indexOf(sortedPasswords[i].id) >= 0 && trashPasswordIds.indexOf(sortedPasswords[i].id) < 0){
			trashPasswords.push(sortedPasswords[i]);
			trashPasswordIds.push(sortedPasswords[i].id);
			addedPasswordIds.push(sortedPasswords[i].id);
		}
	}
	
	tab = $("#maintable tbody");
	tab.empty();
	var visiblePasswords = visiblePasswords.sort(function(a, b){return a.title > b.title ? 1 : -1;});
	for(i in visiblePasswords){
		var tr = $("<tr/>");
		var td = $("<td/>");
		td.html(visiblePasswords[i].title);
		tr.data("pass", visiblePasswords[i]);
		
		
		tr.click(function(){
			var pass = $(this).data("pass");
			showPass(pass.id);
		});
		
		tr.append(td);
		tab.append(tr);
	}
	
	tab = $("#trashtable tbody");
	tab.empty();
	var trashPasswords = trashPasswords.sort(function(a, b){return a.title > b.title ? 1 : -1;});
	for(i in trashPasswords){
		var tr = $("<tr/>");
		var td = $("<td/>");
		td.html(trashPasswords[i].title);
		tr.data("pass", trashPasswords[i]);
		
		
		tr.click(function(){
			var pass = $(this).data("pass");
			changes.push({id: pass.id, type: 1, orderIdx: pass.orderIdx + 1, title: pass.title, username: pass.username, password: pass.password});
			onChange();
		});
		
		tr.append(td);
		tab.append(tr);
	}

	if($("#maintable:visible").length < 1)
		$("#maintable").fadeIn("fast");
}

function showPass(id){

	var pass = null;
	for(var i = passwords.length - 1; i >= 0; i--){
		if(passwords[i].id == id){
			if(passwords[i].type != -1){
				pass = passwords[i];
				break;
			}
		}
	}
	
	if(!pass)
		return;

	var popupCreator = new PopupCreator();
	popupCreator.init({
		title: pass.title,
		content:   "<table>"
					+ "<tr><td>Title: </td><td><input type='text' style='width: " + (isMobileOrNarrow() ? "100%" : "400px") + "; display: block;'></input></td></tr>"
					+ "<tr><td>Username: </td><td><input type='text' style='width: " + (isMobileOrNarrow() ? "100%" : "400px") + "; display: block;'></input></td></tr>"
					+ "<tr><td>Password: </td><td><input type='text' style='width: " + (isMobileOrNarrow() ? "100%" : "400px") + "; display: block;'></input></td></tr>"
					+ "<tr><td></td><td><button id='save' style=''>Save</button><button id='close' style=''>Close</button><button id='remove' style=''>Remove</button></td></tr>"
					+ "</table>",
		maximize: isMobileOrNarrow(),
		onShow: function(){
			var t = this;
			this.element.find("input:eq(0)").val(pass.title);
			this.element.find("input:eq(1)").val(pass.username);
			this.element.find("input:eq(2)").val(pass.password);
			this.element.find("input:first").focus();

			this.element.find("input").keydown(function(e){
				if(e.which == 13 && t.element.find("input:eq(0)").val() != ""){
					t.element.find("#save").click();
				}
			});

			this.element.find("#save").click(function(){

				var newTitle = t.element.find("input:eq(0)").val();
				var newUsername = t.element.find("input:eq(1)").val();
				var newPassword = t.element.find("input:eq(2)").val();

				if(newTitle != pass.title || newUsername != pass.username || newPassword != pass.password){
					pass.title = newTitle;
					pass.username = newUsername;
					pass.password = newPassword;

					changes.push({id: pass.id, type: 0, orderIdx: pass.orderIdx + 1, title: pass.title, username: pass.username, password: pass.password});
					onChange();
				}

				t.close();
			});
			this.element.find("#close").click(function(){
				t.close();
			});
			this.element.find("#remove").click(function(){
				t.close();
				changes.push({id: pass.id, type: -1, orderIdx: pass.orderIdx + 1});
				onChange();
			});
		}
	});
	popupCreator.show();
}

function isMobileOrNarrow(){
	return isMobile() || $(window).innerWidth() < 450;
}