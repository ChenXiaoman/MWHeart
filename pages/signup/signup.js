var util = require('../../utils/util.js');
var common = require('../../utils/common.js');
var Bmob = require('../../utils/bmob.js');  // Initialize cloud server Bmob
const app = getApp(); //get app instance
var that;
var saturday;

Page({

  data: {
    loading: false,

    eventName: null,
    contactPD: null,
    terms: null,

    numPeopleJoined: null,

    isSubmitingUserInfo: false,
    isSignedUp: false,
    isWaiting: false,

    isNotYet: false,
    isOngoing: false,
    isClosed: false,
    isAgree: false,
    isSignUpAllowed: false,

    statusArray: ['Not Yet', 'Ongoing', 'Closed'],
    volunteerList: [],
    waitingList: []
  },


  onShow: function (options) {
    that = this;
    app.getAutoCreate(
      function () {
        refresh();
      });
  },
  onPullDownRefresh: function () {
    refresh()
  },


  //Agree checkbox
  bindAgreeChange: function (e) {
    var isNotYet = that.data.isNotYet;
    var isOngoing = that.data.isOngoing;
    var isClosed = that.data.isClosed;
    var isDeadlineOver = that.data.isDeadlineOver;
    var isAgree = e.detail.value.length === 1 ? true : false;
    var isSignUpAllowed = !isNotYet && isOngoing && !isClosed && !isDeadlineOver && isAgree;
    this.setData({
      isAgree: isAgree,
      isSignUpAllowed: isSignUpAllowed,
    });
  },

  //Terms of Service Panel
  showNotice: function (e) {
    wx.getSystemInfo({
      success: (res) => {
        that.setData({
          windowHeight: res.windowHeight,
          windowWidth: res.windowWidth,
          'notice_status': true
        })
      }
    })

  },
  hideNotice: function (e) {
    this.setData({
      'notice_status': false
    });
  },


  showContactPD: function (e) {
    var contact = that.data.contactPD;
    var content = "Name: " + String(contact.name) + "; Phone/Whatsapp: " + String(contact.phone) + "; WeChat ID: " + String(contact.weChatID);
    //Todo: Display infomation on how to contact PD
    wx.showModal({
      title: 'Contact Project Director',
      content: content,
      confirmText: 'OK',
      showCancel: false,
    })
  },


  /**
   * User can sign up or quit event
   */
  sighUpBtnClick: function (e) {

    // Check whether user have deny getting user info
    if (getApp().globalData.userInfo == null) {
      // Get user's permission
      wx.openSetting({
        success: function (data) {
          if (data) {
            if (data.authSetting["scope.userInfo"] == true) {
              app.getUserInfo(checkNewUser)
            }
          }
        }
      })
    } else {
      checkNewUser()
    }
  },
  quitBtnClick: function (e) {
    quitEvent();
  },


  /**
   * User need to fill up phone and realname
   */
  submitUserInfo: function (e) {
    submitUserInfoForm(e)
  },
  cancelBtnClick: function (e) {
    that.setData({
      isSubmitingUserInfo: false,
    })
  }
})

// Refresh the entire page
// Including upcoming event, event's lists, user sign up status
function refresh() {
  console.log("REFRESHINGINGINGINGINIGNIGNIG")
  that.setData({
    loading: true,
  })

  // Fist ensure event id is loaded
  // Then ensure user info needed is completedly loaded in app.js
  getUpComingEvent(
    function () {
      app.getOpenIdUserIdRealNameAndPhone(getUserSignUpStatus);
    });
}

function checkNewUser() {

  var User = Bmob.Object.extend("user");
  var user = new Bmob.Query(User);

  //Select user with that openid
  user.equalTo("openid", getApp().globalData.openid);
  user.find({
    success: function (results) {
      if (results.length == 0) {
        //Pop up window shows
        that.setData({ isSubmitingUserInfo: true })
      } else {
        //Allow user to sign up
        countPeopleInEvent(signUpUser);
      }
    },
    error: function (error) {
      console.log("查询失败: " + error.code + " " + error.message);
    }
  });
}

function submitUserInfoForm(e) {
  var realName = e.detail.value.realName;
  var phone = e.detail.value.phone;

  // Remove leading or trailing white space
  realName = realName.replace(/^\s+|\s+$/g, "");
  phone = phone.replace(/^\s+|\s+$/g, "");

  if (isInvalidRealName(realName)) {
    wx.showModal({
      title: 'Invalid name',
      content: 'Please enter your name in Pinyin. e.g. Chen Xiaoman',
      confirmText: 'OK',
      showCancel: false
    })
  } else if (isInvalidPhone(phone)) {
    wx.showModal({
      title: 'Invalid phone number',
      content: 'Please enter valid Singapore phone number (8 digit).',
      confirmText: 'OK',
      showCancel: false
    })
  } else {
    // Save new user: openid,name, phone and picture to cloud
    var User = Bmob.Object.extend("user");
    var user = new User();
    console.log("avatar" + getApp().globalData.userInfo.avatarUrl)
    user.save({
      openid: getApp().globalData.openid,
      realName: realName,
      phone: phone,
      avatarUrl: getApp().globalData.userInfo.avatarUrl
    }, {
        success: function (result) {
          // Create new user successfully and Store user objectId
          app.globalData.userId = result.id

          // Close window
          that.setData({ isSubmitingUserInfo: false })
          // Get user sign up
          countPeopleInEvent(signUpUser);
          console.log("***** SignUpPage: End Signing Up New User *****");
        },
        error: function (result, error) {
          console.log("failed to create new user" + error.message)
        }
      });
  }
}

// Get user to sign up for upcoming event
function signUpUser() {
  that.setData({ loading: true })

  // Status 0: waiting list
  // Status 1: volunteer list
  var status = (that.data.numPeopleJoined < that.data.limit) ? 1 : 0;

  var P = Bmob.Object.extend("p");
  var participation = new P();

  var event = Bmob.Object.createWithoutData("event", app.globalData.eventId);
  var user = Bmob.Object.createWithoutData("user", app.globalData.userId);

  participation.set("user", user);
  participation.set("event", event);
  participation.set("status", status);

  participation.save(null, {
    success: function (result) {
      var isNotYet = that.data.isNotYet;
      var isOngoing = that.data.isOngoing;
      var isClosed = that.data.isClosed;
      var isDeadlineOver = that.data.isDeadlineOver;
      var isAgree = that.data.isAgree;
      var isSignUpAllowed = !isNotYet && isOngoing && !isClosed && !isDeadlineOver && isAgree;
      var isWaiting = status == 0 ? true : false;
      that.setData({
        isSignUpAllowed: isSignUpAllowed,
        isSignedUp: true,
        isWaiting: false,
      });
      // Refresh the page
      refresh()
    }
  });

}

function quitEvent() {
  var userId = app.globalData.userId;
  var eventId = app.globalData.eventId;

  wx.showModal({
    title: 'Alert',
    content: 'Quit Event？',
    success: function (res) {
      if (res.confirm) {
        that.setData({ loading: true })
        //delete user from Participation Table
        var P = Bmob.Object.extend("p");
        var query = new Bmob.Query(P);
        query.equalTo("user", userId);
        query.equalTo("event", eventId);
        query.destroyAll({
          success: function () {
            that.setData({
              isSignedUp: false
            })
            console.log("Quit an event")
            getWaitingList(getCandidateToVolunteerList)
          },
          error: function (err) {
            wx.showModal({
              title: 'Failed',
              showCancel: false,
              content: 'Failed to quit. Please try again.',
            })
          }
        });
      }
    }
  })
}

function getCandidateToVolunteerList() {

  if (!that.data.isWaiting) {
    // Not in the waiting list
    // Removing from volunteer list
    console.log("In the volunteer list. Need to get candidate from waiting list")
    if (that.data.waitingList.length > 0) {
      console.log("Waiting list is not empyt")
      // If there is someone in the waiting list
      // Get the first one in the waiting list and remove it from waiting list
      var candidate = that.data.waitingList.shift()
      var candidateId = candidate.user.id

      var eventId = app.globalData.eventId;

      // Get id of Participation Table where contains the candidate
      var P = Bmob.Object.extend("p");
      var query = new Bmob.Query(P);
      query.equalTo("user", candidateId);
      query.equalTo("event", eventId);
      query.first({
        success: function (object) {
          var participationId = object.id
          console.log("participation id for candidate: " + participationId)

          // Update status of candidate to 1
          var P2 = Bmob.Object.extend("p");
          var query2 = new Bmob.Query(P2);
          query2.get(participationId, {
            success: function (result) {
              // Change status to be in volunteer list
              result.set('status', 1);
              result.save();

              console.log("Put candidate into volunteer list")
              common.showTip('Success');
              refresh()
            },
            error: function (object, error) {
              console.log(error.code, error.message)
              that.setData({ loading: false })
            }
          });
        },
        error: function (err) {
          console.log(err.code, err.message)
          that.setData({ loading: false })
        }
      });
    } else {
      console.log("Waiting list is empty")
      common.showTip('Success');
      refresh()
    }
  } else {
    console.log("In waiting list, do nothing")
    common.showTip('Success');
    refresh()
  }
}

function getUpComingEvent(f) {
  that.setData({ loading: true })

  var Event = Bmob.Object.extend("event");
  var event = new Bmob.Query(Event);

  /**
   * Bomb Date default is 8am, eg. 23/12/2017 0800
   * If event date is 23/12/2017 and today is also 23/12/2017
   * Upcoming event will be updated after 8am 23/12/2017
   * 
   * Code below is to avoid this issue
   * If event date is 23/12/2017 and today is also 23/12/2017
   * By setting today to be yesterday
   * Upcoming event will only be updated after 8am 24/12/2017
   */
  var today = new Date();
  today.setDate(today.getDate() - 1);

  //Select Upcoming event
  event.descending('date');

  event.find({
    success: function (results) {
      console.log("Upcoming Event", results);
      app.globalData.eventId = results[0].id;

      var dateString = String(results[0].attributes.date);
      dateString = dateString.replace(/-/g, '/');
      var eventDate = new Date(dateString);
      var hasUpcomingEvent = eventDate >= today;

      if (!hasUpcomingEvent && getApp().globalData.auto) {
        console.log("Have no upcoming event")
        console.log(eventDate)
        console.log(today)
        createNewEvent()

        that.setData({
          loading: false
        })
      } else {
       
      // Display event data
      var limit = results[0].attributes.limit;
      var isNotYet = results[0].attributes.eventStatus == 0 ? true : false;
      var isOngoing = results[0].attributes.eventStatus == 1 ? true : false;
      var isClosed = results[0].attributes.eventStatus == 2 ? true : false;

      var dateString = String(results[0].attributes.deadline);
      dateString = dateString.replace(/-/g, '/');
      var deadline = new Date(dateString);

      var isDeadlineOver = deadline <= today ? true : false;
      isClosed = isClosed || isDeadlineOver
      var isSignUpAllowed = !isNotYet && isOngoing && !isClosed && !isDeadlineOver && that.data.isAgree;
      updateBtnText(isDeadlineOver, isClosed);

      that.setData({
        loading: false,
        eventItem: results[0],
        limit: limit,
        isNotYet: isNotYet,
        isOngoing: isOngoing,
        isClosed: isClosed,
        isDeadlineOver: isDeadlineOver,
        isSignUpAllowed: isSignUpAllowed,

        // Description
        eventName: app.globalData.eventName,
        contactPD: app.globalData.contactPD,
        terms: app.globalData.terms,
      })
      if (isNotYet) {
        // Do nothing
        console.log("Event sign up not yet.")
      } else {
        countPeopleInEvent();
        getVolunteerList();
        getWaitingList();
        // Execute function parameter passed in
        f();
      }
    }},
    error: function (error) {
      console.log("查询失败: " + error.code + " " + error.message);
    }
  });
}

/**
 * Determine the signing up status
 * status = 1 to indicate already signed up, in volunteer list
 * status = 0 to indicate not signed up yet, in waiting list
 */
function getUserSignUpStatus() {
  console.log("***** SignupPage:Start get userSignUpStatus *****");
  that.setData({ loading: true })

  var P = Bmob.Object.extend("p");
  var query = new Bmob.Query(P);
  var userId = app.globalData.userId;
  var eventId = app.globalData.eventId;
  query.equalTo("user", userId);
  query.equalTo("event", eventId);
  query.find({
    success: function (result) {
      if (result.length == 0) {
        console.log("User SignUp Status: Not signed up yet.");
        that.setData({
          isSignedUp: false,
          loading: false
        })
      } else {
        console.log("User SignUp Status: ", result[0].attributes.status);
        // Check if the user is in waiting list
        if (result[0].attributes.status == 0) {
          that.setData({
            isWaiting: true
          })
        } else {
          that.setData({
            isWaiting: false
          })
        }
        that.setData({
          status: result[0].attributes.status,
          isSignedUp: true,
          loading: false
        })
      }
      console.log("***** SignupPage:End get userSignUpStatus *****");

    },
    error: function (object, error) {
      console.log(error.message)
    }
  });
}


function countPeopleInEvent(f) {
  that.setData({ loading: true })
  //One user for One Event
  var P = Bmob.Object.extend("p");
  var query = new Bmob.Query(P);
  var eventId = app.globalData.eventId;
  query.equalTo("event", eventId);
  query.find({
    success: function (results) {
      console.log("NumPeople joined: ", results.length);
      that.setData({
        loading: false,
        numPeopleJoined: results.length,
      }, f)
    },
    error: function (error) {
      console.log("查询失败: " + error.code + " " + error.message);
    }
  });
}

function updateBtnText(isDeadlineOver, isClosed) {
  var btnText = "";
  if (isClosed || isDeadlineOver) {
    btnText = "Closed";
  } else {
    btnText = "Sign Up";
  }
  that.setData({ btnText: btnText })
}

function isInvalidRealName(realName) {
  console.log("\'" + realName + "\'")
  var isInvalid = realName == null || realName.toString().length < 4
  console.log("Is real name invalid? " + isInvalid)
  return isInvalid;
}

function isInvalidPhone(phoneNum) {
  phoneNum = Number(phoneNum);
  var isInvalid = !Number.isInteger(phoneNum) || phoneNum < 0 || phoneNum.toString().length != 8;
  console.log("Is phone number invalid? " + isInvalid)
  //Phone length must be 8 and must be num only
  return isInvalid
}

function getVolunteerList() {
  that.setData({ loading: true })
  //One user for One Event
  var P = Bmob.Object.extend("p");
  var query = new Bmob.Query(P);
  var eventId = app.globalData.eventId;
  query.equalTo("event", eventId);
  query.equalTo("status", 1)
  query.ascending('updatedAt');
  query.include("user");
  var volunteerList = [];
  query.find({
    success: function (results) {
      for (var i = 0; i < results.length; i++) {
        var user = [{ user: results[i].attributes.user, updatedAt: results[i].updatedAt }]
        volunteerList = volunteerList.concat(user);
      }
      that.setData({
        volunteerList: volunteerList,
        loading: false
      })
    },
    error: function (error) {
      console.log("查询失败: " + error.code + " " + error.message);
    }
  });
}

function getWaitingList(f) {
  that.setData({ loading: true })
  //One user for One Event
  var P = Bmob.Object.extend("p");
  var query = new Bmob.Query(P);
  var eventId = app.globalData.eventId;
  query.equalTo("event", eventId);
  query.equalTo("status", 0)
  query.ascending('updatedAt');
  query.include("user");
  var waitingList = [];
  query.find({
    success: function (results) {
      for (var i = 0; i < results.length; i++) {
        var user = [{ user: results[i].attributes.user, updatedAt: results[i].updatedAt }]
        waitingList = waitingList.concat(user);
      }
      that.setData({
        waitingList: waitingList,
        loading: false
      }, f)
    },
    error: function (error) {
      console.log("查询失败: " + error.code + " " + error.message);
    }
  });
}

function createNewEvent() {
  /**Create Event Page */
  saturday = getNextSaturday();
  // Default Deadline is Wednesday
  var deadline = getNextSaturday();
  deadline.setDate(deadline.getDate() - 3);
  var fullDeadline = util.formatDate(deadline);

  var date = saturday;
  var fullDate = util.formatDate(new Date(date));
  var time = "1pm - 3pm";
  var limit = 16;
  var duration = 3;
  var eventStatus = 0

  //Upload Event information to Bmob
  var Event = Bmob.Object.extend("event");
  var event = new Event();

  event.save({
    date: date,
    fullDate: fullDate,
    deadline: deadline,
    fullDeadline: fullDeadline,
    time: time,
    limit: limit,
    duration: duration,
    eventStatus: eventStatus
  }, {
      success: function (result) {
        that.setData({ 
          loading: false,
          isNotYet: true,
          numPeopleJoined: null,

          isSubmitingUserInfo: false,
          isSignedUp: false,
          isWaiting: false,

          isOngoing: false,
          isClosed: false,
          isAgree: false,
          isSignUpAllowed: false,

          volunteerList: [],
          waitingList: [] 
        })
        console.log("Event created successfully")
        refresh()
      },
      error: function (result, error) {
        that.setData({
          loading: false
        })
        console.log("failed to create event", error.message)
      }
    })
}

/**
 * Get next Saturday Date
 */
function getNextSaturday() {
  var day = Number(new Date().getDay());
  var offSet = 0;
  while (day !== 6) {
    offSet++;
    day++;
  }
  var saturday = new Date(new Date().setDate(new Date().getDate() + offSet));
  return saturday
}