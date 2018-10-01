var util = require('../../../utils/util.js');
var Bmob = require('../../../utils/bmob.js');
var common = require('../../../utils/common.js');
var util = require('../../../utils/util.js');
var Show = require("../../../utils/alert/alert.js");
const app = getApp(); //get app instance
var that;
var saturday = null;
var file = null;




Page({

  /**
   * 页面的初始数据
   */
  data: {

    loading: false,

    date: null,
    fullDate: null,
    deadline: null,
    fullDeadline: null,
    time: null,
    limit: null,
    duration: null,
    eventStatus: null,
    picUrl: null,
    oldPicUrl: null,
    eventId: null,
    buttonText: null,
    formText: null,
    
    isUpdateEvent:false,

    statusArray: ['Not Yet', 'Ongoing', 'Closed'],
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    that = this;

    //To determine CreateEvent Page or UpdateEvent Page
    var isUpdateEvent = options.isUpdateEvent == "true" ? true : false;

    /**
     * Update Event Page
     */
    if (isUpdateEvent) {
      var eventId = String(options.objectId);
      this.setData({
        isUpdateEvent: isUpdateEvent,
        eventId: eventId,
      })
      getEvent(this, eventId);

    } else {
      /**Create Event Page */
      saturday = getNextSaturday(); 
      // Default Deadline is Wednesday
      var deadline = getNextSaturday();
      deadline.setDate(deadline.getDate() - 3);
      var fullDeadline = util.formatDate(deadline);

      this.setData({
        date: saturday,
        fullDate: util.formatDate(saturday),
        deadline: deadline,
        fullDeadline: fullDeadline,
        time: "1pm - 3pm",
        limit: "16",
        duration: 3,
        eventStatus: 0,
        buttonText: "Create New Event",
        formText: "submitForm",
        loading: false,
      })
    }
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function () {

  },

  /**
   * Event Status
   * 0 = Not Yet
   * 1 = Ongoing
   * 2 = Closed
   */
  onPickerChange: function (e) {
    var eventStatus = e.detail.value
    this.setData({
      eventStatus: eventStatus
    })
  },

  bindDateChange: function (e) {
    var date = new Date(e.detail.value);
    var fulldate = util.formatDate(date);
    this.setData({
      date: date,
      fullDate: fulldate
    })
  },

  bindDeadlineChange: function (e) {
    var deadline = new Date(e.detail.value);
    var fullDeadline = util.formatDate(deadline);
    this.setData({
      deadline: deadline,
      fullDeadline: fullDeadline
    })
  },


  //Submit form
  submitForm: function (e) {
    createEvent(e)
  },

  modifyForm: function (e) {
    modifyEvent(e)
  },
  //Delete User After clicked Delete Button
  deleteBtnClick: function (event) {
    deleteEvent();
  },

  upPic: function (e) {
    console.log("click!!")
    upPic(this);
  },

  delPic: function (e) {
    delPic(this);
  },


})

function createEvent(e) {
  var t = that;
  that.setData({ loading: true })
  // Event information
  var date = new Date((e.detail.value.date));
  var fullDate = util.formatDate(new Date(date));
  var deadline = new Date((e.detail.value.deadline));
  var fullDeadline = util.formatDate(new Date(deadline));
  var time = e.detail.value.time;
  var limit = Number(e.detail.value.limit);
  var duration = Number(e.detail.value.duration);
  var eventStatus = Number(e.detail.value.eventStatus)

  //Valid Event information
  if (!isValidDeadline(date, deadline)) {
    Show.showAlert(t, "warn", 'Deadline must before the actual Date');
  } else if (!isValidLimit(limit)) {
    Show.showAlert(t, "warn", 'Limit must be positive integer');
  } else if (!isValidDuration(duration)) {
    Show.showAlert(t, "warn", 'Duration must be positive integer');
  } else {
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
          that.setData({loading: false})
          wx.navigateBack({
            delta: 1
          })
          common.showTip('Success');
        },
        error: function (result, error) {
          common.showTip('Fail');
          console.log("failed to create event", error)
        }
      })
  }
  that.setData({ loading: false })
}

/*
* Get Event Detail from Bmob
*/
function getEvent(t, k) {
  that.setData({loading:true})
  var Event = Bmob.Object.extend("event");
  var event = new Bmob.Query(Event);
  var eventId = k;

  event.get(eventId, {
    success: function (results) {
      that.setData({
        loading: false,
        //Load Event information
        date: results.attributes.date,
        fullDate: results.attributes.fullDate,
        deadline: results.attributes.deadline,
        fullDeadline: results.attributes.fullDeadline,
        time: results.attributes.time,
        limit: results.attributes.limit,
        duration: results.attributes.duration,
        eventStatus: results.attributes.eventStatus,
        formText: "modifyForm",
        buttonText: "Update Event",
      })
      // Get pic url if the event image is not null
      if (results.attributes.pic) {
        that.setData({ picUrl: results.attributes.pic._url })
      }
      wx.setNavigationBarTitle({
        title: "Update Event",
      });
    },
    error: function (object, error) {
      // 查询失败
    }
  });
}

/**
 * When UpdateEventBtn is clicked, upload event info to Bmob
 */
function modifyEvent(e) {
  that.setData({loading: true })
  // Event information
  var date = new Date((e.detail.value.date));
  var fullDate = util.formatDate(new Date(date));
  var deadline = new Date((e.detail.value.deadline));
  var fullDeadline = util.formatDate(new Date(deadline));
  var time = e.detail.value.time;
  var limit = Number(e.detail.value.limit);
  var duration = Number(e.detail.value.duration);
  var eventStatus = Number(e.detail.value.eventStatus)
  var picFile = file

  //Valid Event information
  if (!isValidDeadline(date, deadline)) {
    Show.showAlert(t, "warn", 'Deadline must before the actual Date');
  } else if (!isValidLimit(limit)) {
    Show.showAlert(t, "warn", 'Limit must be positive integer');
  } else if (!isValidDuration(duration)) {
    Show.showAlert(t, "warn", 'Duration must be positive integer');
  } else {
    //Upload Event info to Bmob
    var Event = Bmob.Object.extend("event");
    var event = new Bmob.Query(Event);

    event.get(that.data.eventId, {
      success: function (result) {
        result.set('date', date);
        result.set('fullDate', fullDate);
        result.set('deadline', deadline);
        result.set('fullDeadline', fullDeadline);
        result.set('time', time);
        result.set('limit', limit);
        result.set('duration', duration);
        result.set('eventStatus', eventStatus);

        // Handle pic file
        if (file) {
          // There is a uploaded new pic
          console.log("not empty")
          result.set('pic', file);
        } else {
          // No new uploaded pic
          console.log("empty")
          var path = that.data.oldPicUrl;

          // Need to delete old pic
          if (path) {
            var s = new Bmob.Files.del(path).then(function (res) {
              if (res.msg == "ok") {
                console.log("Cloud storage pic deleted")
              }
            }, function (error) {
              console.log(error)
            }
            );
            result.unset("pic");
          }
        }
        result.save();
        that.setData({loading: false })
        
        wx.navigateBack({
          delta: 1
        })  
        common.showTip('Success');
      },
      error: function (object, error) {
        common.showTip('Fail');
        console.log("Event updated Fail");
      }
    });
  }
}

function deleteEvent(){
  var eventId = that.data.eventId
  wx.showModal({
    title: 'Alert',
    content: 'Delete Event？',
    success: function (res) {
      if (res.confirm) {
        //delete user
        var Event = Bmob.Object.extend("event");
        //创建查询对象，入口参数是对象类的实例
        var event = new Bmob.Query(Event);
        event.equalTo("objectId", eventId);
        
        event.destroyAll({
          success: function () {
            wx.navigateBack({
              delta: 1
            })
            common.showTip('Success');
          },
          error: function (err) {
            common.showTip('Fail', 'loading');
          }
        })
      }
    }
  })
}

function delPic(t) {//图片删除
  console.log('Event image deleted');
  common.showTip("Deleted");
  that.setData({
    oldPicUrl: that.data.picUrl,
    picUrl: null
  })
  file = null;
}

function upPic(t, e) {
  var that = t;
  wx.chooseImage({
    count: 1,
    success: function (res) {
      wx.showNavigationBarLoading()
      that.setData({
        loading: true
      })
      var tempFilePaths = res.tempFilePaths;
      console.log(tempFilePaths)
      var url;
      console.log(tempFilePaths);
      if (tempFilePaths.length > 0) {
        // Set file name to date.png
        var extension = /\.([^.]*)$/.exec(tempFilePaths[0]);
        if (extension) {
          extension = extension[1].toLowerCase();
        }
        var newDate = new Date(that.data.date)
        var newDateStr = util.formatTimeDMY(newDate);
        var name = newDateStr + "." + extension;

        // Upload file
        file = new Bmob.File(name, tempFilePaths);
        file.save().then(function (res) {
          url = res.url();
          console.log("Upload image successfully: " + name)
          // Set data
          that.setData({
            loading: false,
            picUrl: url
          })

        }, function (error) {
          console.log(error);
        })
      }
    }
  })
}

function isValidDeadline(date, deadline) {
  //Deadline must before date
  return date >= deadline;
}

function isValidLimit(limit) {
  return Number.isInteger(limit) && limit >= 0;
}

function isValidDuration(duration) {
  return Number.isInteger(duration) && duration >= 0;
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