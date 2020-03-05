String.prototype.replaceAll = function(search, replacement) {
    var target = this;
    return target.replace(new RegExp(search, 'g'), replacement);
};

function handle_nan(val) {
    return (isNaN(val)) ? 0 : val;
}

function change_gem_label($refill_number, $gem_label, costs) {
    function getSum(total, num) {
        return total + num;
    }
    $gem_label.text(costs.slice(0, handle_nan(parseInt($refill_number.val())) + 1).reduce(getSum));
}

function hide_or_show_pet($pet, data, hide) {
    if (data.fragments >= 330 && hide) {
        $pet.addClass('invisible');
    } else {
        $pet.removeClass('invisible');
    }
}

(function(yourcode) {

    yourcode(window.jQuery, window.indexedDB, window, document);

}(function($, indexedDB, window, document) {

    $(function() {

        $(".user-input[type='number']").inputSpinner();

        $("#import-button").click(function() {
            $('#dbupload').trigger('click');
        });

        $("#dbupload").change(function(e) {
            var files = document.getElementById('dbupload').files;
            var fr = new FileReader();
            fr.onload = function(e) {
                var result = JSON.parse(e.target.result);
                var db = new Dexie('endless-farming-db');
                db.open().then(function() {
                    var idb_db = db.backendDB();
                    clearDatabase(idb_db, function(err) {
                        if (!err) {
                            importFromJsonString(idb_db, result, function(err) {
                                if (!err) {
                                    console.log("Imported data successfully");
                                    location.reload();
                                    return false;
                                }
                            });
                        }
                    });
                });
            };
            fr.readAsText(files.item(0));
        });

        $("#export-button").on("click", function(e) {
            var db = new Dexie('endless-farming-db');
            db.open().then(function() {
                var idb_db = db.backendDB();
                exportToJsonString(idb_db, function(err, jsonString) {
                    if (err) {
                        console.error(err);
                    } else {
                        var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(jsonString));
                        var downloadAnchorNode = document.createElement('a');
                        downloadAnchorNode.setAttribute("href", dataStr);
                        downloadAnchorNode.setAttribute("download", "endless_farming.json");
                        document.body.appendChild(downloadAnchorNode); // required for firefox
                        downloadAnchorNode.click();
                        downloadAnchorNode.remove();
                    }
                });
            });
        });

        request = idb.open('endless-farming-db');
        request.then(function(db) {
            var tx = db.transaction('player', 'readwrite');
            var store = tx.objectStore('player');
            var KL = store.get("KL");
            KL.then(function(val) {
                if (val !== undefined) {
                    $("#KL-number").val(val.value);
                }
            });
            var tickets = store.get("tickets");
            tickets.then(function(val) {
                if (val !== undefined) {
                    $("#tickets-number").val(val.value);
                }
            });
            var refills = store.get("refills");
            refills.then(function(val) {
                if (val !== undefined) {
                    $("#refills-number").val(val.value);
                    change_gem_label($("#refills-number"), $("#gem-label"), [0, 100, 200, 400, 800, 1200, 1600]);
                }
            });
            var tickets_hard = store.get("tickets_hard");
            tickets_hard.then(function(val) {
                if (val !== undefined) {
                    $("#tickets_hard-number").val(val.value);
                }
            });
            var refills_hard = store.get("refills_hard");
            refills_hard.then(function(val) {
                if (val !== undefined) {
                    $("#refills_hard-number").val(val.value);
                    change_gem_label($("#refills_hard-number"), $("#gem-hard-label"), [0, 200, 400, 800]);
                }
            });
            var hide_five_star_pets = store.get("hide_five_star_pets");
            hide_five_star_pets.then(function(val) {
                if (val !== undefined) {
                    $('#hide-five-star-pets').prop("checked", val.value);
                }
            });
        });

        $(".user-input").bind('change', async function() {
            $this = $(this);
            db = await idb.open('endless-farming-db');
            var tx = await db.transaction('player', 'readwrite');
            var store = await tx.objectStore('player');
            var new_KL = $this.val()
            var KL = store.put({
                name: $this.attr("id").replace("-number", ""),
                value: new_KL
            });
            if ($this.attr("id") == "KL-number" && $("#dragable-row").length != 0) {
                console.log(new_KL)
                updateStages(new_KL);
            }
            if ($("#dragable-row").length != 0) {
                calculatePetFragmentsToFarm();
            }
        });

        $("#hide-five-star-pets").bind('change', async function() {
            $this = $(this);
            db = await idb.open('endless-farming-db');
            request
            var tx = await db.transaction('player', 'readwrite');
            var store = await tx.objectStore('player');
            var hide = $('#hide-five-star-pets').prop("checked")
            var KL = store.put({
                name: 'hide_five_star_pets',
                value: hide
            });
            for (const pet of $("#dragable-row").children('.pet-card')) {
                $pet = $(pet)
                var input = $pet.find(".pet-input[type='number']");
                hide_or_show_pet($pet, { fragments: input.val() }, hide);
            }

        });

        $("#refills-number").bind('change', function() {
            change_gem_label($(this), $("#gem-label"), [0, 100, 200, 400, 800, 1200, 1600]);
        });

        $("#refills_hard-number").bind('change', function() {
            change_gem_label($(this), $("#gem-hard-label"), [0, 200, 400, 800]);
        });

        $('#stats-modal').on('show.bs.modal', function(event) {
            var button = $(event.relatedTarget);
            var text = button.data('welcome-text');
            var modal = $(this);
            modal.find('#welcome-text').children().first().text(text);
        });
    });

    (function() {
        'use strict';
        //check for support
        if (!('indexedDB' in window)) {
            console.log('This browser doesn\'t support IndexedDB');
            return;
        }
        var dbPromise = idb.open('endless-farming-db', 4, function(upgradeDb) {
            switch (upgradeDb.oldVersion) {
                case 0:
                    if (!upgradeDb.objectStoreNames.contains('units')) {
                        var unitsOS = upgradeDb.createObjectStore('units', {
                            keyPath: 'name'
                        });
                        unitsOS.createIndex('nsr', 'nsr', {
                            unique: false
                        });
                        unitsOS.createIndex('sr', 'sr', {
                            unique: false
                        });
                    }
                    if (!upgradeDb.objectStoreNames.contains('pets')) {
                        var petsOS = upgradeDb.createObjectStore('pets', {
                            keyPath: 'name'
                        });
                        petsOS.createIndex('fragments', 'fragments', {
                            unique: false
                        });
                    }
                case 1:
                    if (!upgradeDb.objectStoreNames.contains('player')) {
                        var playerOS = upgradeDb.createObjectStore('player', {
                            keyPath: 'name',
                            autoIncrement: true
                        });
                        playerOS.createIndex('value', 'value', {
                            unique: false
                        });
                        playerOS.get("KL").then(function(val) {
                            if (val == undefined) {
                                playerOS.put({
                                    "name": "KL",
                                    "value": 1
                                });
                            }
                        });
                        playerOS.get("tickets").then(function(val) {
                            if (val == undefined) {
                                playerOS.put({
                                    "name": "tickets",
                                    "value": 10
                                });
                            }
                        });
                        playerOS.get("refills").then(function(val) {
                            if (val == undefined) {
                                playerOS.put({
                                    "name": "refills",
                                    "value": 0
                                });
                            }
                        });
                    }
                    var petsOS = upgradeDb.transaction.objectStore('pets');
                    petsOS.createIndex('priority', 'priority', {
                        unique: false
                    });
                case 2:
                    if (!upgradeDb.objectStoreNames.contains('pets_hard')) {
                        var pets_hardOS = upgradeDb.createObjectStore('pets_hard', {
                            keyPath: 'name'
                        });
                        pets_hardOS.createIndex('fragments', 'fragments', {
                            unique: false
                        });
                        pets_hardOS.createIndex('priority', 'priority', {
                            unique: false
                        });
                    }
                    var playerOS = upgradeDb.transaction.objectStore('player');
                    playerOS.get("tickets_hard").then(function(val) {
                        if (val == undefined) {
                            playerOS.put({
                                "name": "tickets_hard",
                                "value": 5
                            });
                        }
                    });
                    playerOS.get("refills_hard").then(function(val) {
                        if (val == undefined) {
                            playerOS.put({
                                "name": "refills_hard",
                                "value": 0
                            });
                        }
                    });
                case 3:
                    var playerOS = upgradeDb.transaction.objectStore('player');
                    playerOS.get("hide_five_star_pets").then(function(val) {
                        if (val == undefined) {
                            playerOS.put({
                                "name": "hide_five_star_pets",
                                "value": false
                            });
                        }
                    });
            }
        });
    })();
}));