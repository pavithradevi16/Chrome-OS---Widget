'use strict';

var tabsFromBackground;
var storage = new LocalStorage();
var ui = new UI();
var totalTime, averageTime;
var tabsFromStorage;
var targetTabs;
var currentTypeOfList;
var setting_range_days;
var setting_dark_mode;
var restrictionList;
var stat = {
    set firstDay(value) {
        document.getElementById('statFirstDay').innerHTML = value;
    },
    set activeDays(value) {
        document.getElementById('statActiveDays').innerHTML = value;
    },
    set totalDays(value) {
        document.getElementById('statTotalDays').innerHTML = value;
    },
    set inActiveDay(value) {
        document.getElementById('statInActiveDay').innerHTML = value;
        this.inActiveDayValue = value;
    },
    get inActiveDay() {
        return this.inActiveDayValue;
    },
    set inActiveDayWithoutCurrentDay(value) {
        document.getElementById('statInActiveDayWithoutCurrentDay').innerHTML = value;
        this.inActiveDayWithoutCurrentDayValue = value;
    },
    get inActiveDayWithoutCurrentDay() {
        return this.inActiveDayWithoutCurrentDayValue;
    },
    set inActiveDayTime(value) {
        document.getElementById('statInActiveDayTime').innerHTML = '';
        ui.createElementsForTotalTime(value, TypeListEnum.ToDay, document.getElementById('statInActiveDayTime'));
        this.inActiveDayTimeValue = value;
    },
    get inActiveDayTime() {
        return this.inActiveDayTimeValue;
    },
    set inActiveDayTimeWithoutCurrentDay(value) {
        document.getElementById('statInActiveDayTimeWithoutCurrentDay').innerHTML = '';
        ui.createElementsForTotalTime(value, TypeListEnum.ToDay, document.getElementById('statInActiveDayTimeWithoutCurrentDay'));
        this.inActiveDayTimeWithoutCurrentDayValue = value;
    },
    get inActiveDayTimeWithoutCurrentDay() {
        return this.inActiveDayTimeWithoutCurrentDayValue;
    },
    set activeDay(value) {
        document.getElementById('statActiveDay').innerHTML = value;
    },
    set activeDayWithoutCurrentDay(value) {
        document.getElementById('statActiveDayWithoutCurrentDay').innerHTML = value;
    },
    set averageTime(value) {
        document.getElementById('statAverageTime').innerHTML = '';
        ui.createElementsForTotalTime(value, TypeListEnum.ToDay, document.getElementById('statAverageTime'));
    },
    set activeDayTime(value) {
        document.getElementById('statActiveDayTime').innerHTML = '';
        ui.createElementsForTotalTime(value, TypeListEnum.ToDay, document.getElementById('statActiveDayTime'));
    },
    set activeDayTimeWithoutCurrentDay(value) {
        document.getElementById('statActiveDayTimeWithoutCurrentDay').innerHTML = '';
        ui.createElementsForTotalTime(value, TypeListEnum.ToDay, document.getElementById('statActiveDayTimeWithoutCurrentDay'));
    },
    set todayTime(value) {
        document.getElementById('statTodayTime').innerHTML = '';
        ui.createElementsForTotalTime(value, TypeListEnum.ToDay, document.getElementById('statTodayTime'));
    },
    set allDaysTime(value) {
        document.getElementById('statAllDaysTime').innerHTML = '';
        ui.createElementsForTotalTime(value, TypeListEnum.All, document.getElementById('statAllDaysTime'));
    },
};

document.addEventListener('DOMContentLoaded', function () {
    ui.setPreloader();

    storage.getValue(SETTINGS_INTERVAL_RANGE, function (item) { setting_range_days = item; });
    document.getElementById('btnToday').addEventListener('click', function () {
        currentTypeOfList = TypeListEnum.ToDay;
        ui.setUIForToday();
        getDataFromStorage();
    });
    document.getElementById('donutChartBtn').addEventListener('click', function () {
        ui.setUIForDonutChart();
        getDataFromStorage();
    });

    document.getElementById('btnAll').addEventListener('click', function () {
        currentTypeOfList = TypeListEnum.All;
        ui.setUIForAll();
        getDataFromStorage();
    });
    document.getElementById('btnByDays').addEventListener('click', function () {
        currentTypeOfList = TypeListEnum.ByDays;
        ui.setUIForByDays(setting_range_days);
        getDataFromStorageByDays();
    });
    document.getElementById('statInActiveDayIcon').addEventListener('click', function () {
        fillBlockWithInActiveDay();
    });
    document.getElementById('statActiveDayIcon').addEventListener('click', function () {
        fillBlockWithActiveDay();
    });

    
});

firstInitPage();

function firstInitPage() {
    chrome.runtime.getBackgroundPage(function (bg) {
        setting_dark_mode = bg.setting_dark_mode;
        ui.setMode();
        tabsFromBackground = bg.tabs;
        currentTypeOfList = TypeListEnum.ToDay;
        getLimitsListFromStorage(bg.setting_restriction_list)
        getDataFromStorage();
        storage.getValue(SETTINGS_SHOW_HINT, function (item) {
            if (item)
                document.getElementById('hintForUsers').classList.remove('hide');
        });
    });
}
window.addEventListener('click', function (e) {
    if (e.target.nodeName == 'SPAN' && e.target.className == 'span-url' && e.target.attributes.href.value != undefined){
        chrome.tabs.create({ url: e.target.attributes.href.value })
    }
});

function getDataFromStorage() {
    if (tabsFromBackground != undefined && tabsFromBackground != null && tabsFromBackground.length > 0)
        getTabsFromStorage(tabsFromBackground);
    else fillEmptyBlock();
}

function getLimitsListFromStorage(items) {
    if (items !== undefined)
        restrictionList = items;
    else restrictionList = [];
}

function fillEmptyBlock() {
    ui.removePreloader();
    ui.fillEmptyBlock('chart');
}

function getTabsFromStorage(tabs) {
    tabsFromStorage = tabs;
    targetTabs = [];

    ui.clearUI();
    if (tabs === null) {
        ui.fillEmptyBlock('chart');
        return;
    }

    var counterOfSite;
    if (currentTypeOfList === TypeListEnum.All) {
        targetTabs = tabs.sort(function (a, b) {
            return b.summaryTime - a.summaryTime;
        });

        if (targetTabs.length > 0) {
            totalTime = getTotalTime(targetTabs);
            stat.allDaysTime = totalTime;

        } else {
            ui.fillEmptyBlock('chart');
            return;
        }

        counterOfSite = tabs.length;
    }
    if (currentTypeOfList === TypeListEnum.ToDay) {
        targetTabs = tabs.filter(x => x.days.find(s => s.date === todayLocalDate()));
        counterOfSite = targetTabs.length;
        if (targetTabs.length > 0) {
            targetTabs = targetTabs.sort(function (a, b) {
                return b.days.find(s => s.date === todayLocalDate()).summary - a.days.find(s => s.date === todayLocalDate()).summary;
            });

            totalTime = getTotalTime(targetTabs);
            stat.todayTime = totalTime;
        } else {
            ui.fillEmptyBlock('chart');
            return;
        }
    }

    // if (currentTypeOfList === TypeListEnum.All)
    //     ui.addTableHeader(currentTypeOfList, counterOfSite, totalTime, getFirstDay());
    // if (currentTypeOfList === TypeListEnum.ToDay)
    //     ui.addTableHeader(currentTypeOfList, counterOfSite, totalTime);

    var currentTab = getCurrentTab();

    var tabsForChart = [];
    var summaryCounter = 0;
    for (var i = 0; i < targetTabs.length; i++) {
        var summaryTime;
        var counter;
        if (currentTypeOfList === TypeListEnum.ToDay) {
            summaryTime = targetTabs[i].days.find(x => x.date == todayLocalDate()).summary;
            let item = targetTabs[i].days.find(x => x.date == todayLocalDate());
            if (item != null)
              counter = item.counter;
        }
        if (currentTypeOfList === TypeListEnum.All) {
            summaryTime = targetTabs[i].summaryTime;
            counter = targetTabs[i].counter;
        }

        summaryCounter += counter;

        if (currentTypeOfList === TypeListEnum.ToDay || (currentTypeOfList === TypeListEnum.All && i <= 30))
            ui.addLineToTableOfSite(targetTabs[i], currentTab, summaryTime, currentTypeOfList, counter);
        else
            ui.addExpander();

        if (i <= 8)
            addTabForChart(tabsForChart, targetTabs[i].url, summaryTime, counter);
        else addTabOthersForChart(tabsForChart, summaryTime);
    }

    if (currentTypeOfList === TypeListEnum.ToDay)
        ui.drawChart(tabsForChart);
    ui.setActiveTooltipe(currentTab);

    ui.removePreloader();
}

function getTabsForTimeChart(timeIntervals) {
    var resultArr = [];
    if (timeIntervals != undefined) {
        timeIntervals.forEach(function (data) {
            if (data.day == todayLocalDate()) {
                data.intervals.forEach(function (interval) {
                    resultArr.push({ 'domain': data.domain, 'interval': interval });
                });
            }
        });
    }
    return resultArr;
}

function getTabsForExpander() {
    if (tabsFromBackground != undefined && tabsFromBackground != null && tabsFromBackground.length > 0)
        getTabsFromStorageForExpander(tabsFromBackground);
}

function getTimeIntervalList() {
    storage.getValue(STORAGE_TIMEINTERVAL_LIST, drawTimeChart);
}

function drawTimeChart(items) {
    ui.drawTimeChart(getTabsForTimeChart(items));
}

function getTabsFromStorageForExpander(tabs) {
    tabsFromStorage = tabs;
    targetTabs = [];

    targetTabs = tabs.sort(function (a, b) {
        return b.summaryTime - a.summaryTime;
    });

    var currentTab = getCurrentTab();

    for (var i = 31; i < targetTabs.length; i++) {
        var summaryTime;
        var counter;
        if (currentTypeOfList === TypeListEnum.ToDay) {
            summaryTime = targetTabs[i].days.find(x => x.date == todayLocalDate()).summary;
            let item = targetTabs[i].days.find(x => x.date == todayLocalDate());
            if (item != undefined)
                counter = item.counter;
        }
        if (currentTypeOfList === TypeListEnum.All) {
            summaryTime = targetTabs[i].summaryTime;
            counter = targetTabs[i].counter;
        }

        ui.addLineToTableOfSite(targetTabs[i], currentTab, summaryTime, currentTypeOfList, counter);
    }

    var table = ui.getTableOfSite();
    table.removeChild(table.getElementsByTagName('hr')[0]);
}

function getTotalTime(tabs) {
    var total;
    if (currentTypeOfList === TypeListEnum.ToDay) {
        var summaryTimeList = tabs.map(function (a) { return a.days.find(s => s.date === todayLocalDate()).summary; });
        total = summaryTimeList.reduce(function (a, b) { return a + b; })
    }
    if (currentTypeOfList === TypeListEnum.All) {
        var summaryTimeList = tabs.map(function (a) { return a.summaryTime; });
        total = summaryTimeList.reduce(function (a, b) { return a + b; })
    }
    return total;
}

function getTotalTimeForDay(day, tabs) {
    var total;
    var summaryTimeList = tabs.map(function (a) { return a.days.find(s => s.date === day).summary; });
    total = summaryTimeList.reduce(function (a, b) { return a + b; })
    return total;
}

function getPercentage(time) {
    return ((time / totalTime) * 100).toFixed(2) + ' %';
}

function getPercentageForChart(time) {
    return ((time / totalTime) * 100).toFixed(2) / 100;
}

function getCurrentTab() {
    return chrome.extension.getBackgroundPage().currentTab;
}

function addTabForChart(tabsForChart, url, time, counter) {
    tabsForChart.push({
        'url': url,
        'percentage': getPercentageForChart(time),
        'summary': time,
        'visits': counter
    });
}

function addTabOthersForChart(tabsForChart, summaryTime) {
    var tab = tabsForChart.find(x => x.url == 'Others');
    if (tab === undefined) {
        tabsForChart.push({
            'url': 'Others',
            'percentage': getPercentageForChart(summaryTime),
            'summary': summaryTime
        });
    } else {
        tab['summary'] += summaryTime;
        tab['percentage'] = getPercentageForChart(tab['summary']);
    }
}

function setStatData(array) {
    var arrayAscByTime = [];
    var arrayAscByTimeWithoutCurrentDay = [];
    tabsFromStorage.forEach(tab => {
        return tab.days.forEach(day => {
            var item = arrayAscByTime.find(x => x.date == day.date);
            if (item !== undefined) {
                return item.total += day.summary;
            }
            if (item === undefined)
                return arrayAscByTime.push({
                    'date': day.date,
                    'total': day.summary
                });
        });
    });

    arrayAscByTimeWithoutCurrentDay = arrayAscByTime.filter(function (item) {
        return item.date != todayLocalDate();
    })

    arrayAscByTime = arrayAscByTime.sort(function (a, b) {
        return a.total - b.total;
    });

    arrayAscByTimeWithoutCurrentDay = arrayAscByTimeWithoutCurrentDay.sort(function (a, b) {
        return a.total - b.total;
    });

    stat.inActiveDay = new Date(arrayAscByTime[0].date).toLocaleDateString();
    stat.activeDay = new Date(arrayAscByTime[arrayAscByTime.length - 1].date).toLocaleDateString();;
    stat.inActiveDayTime = arrayAscByTime[0].total;
    stat.activeDayTime = arrayAscByTime[arrayAscByTime.length - 1].total;

    //exclude current day from summary statistics 
    if (arrayAscByTimeWithoutCurrentDay.length > 0) {
        stat.inActiveDayWithoutCurrentDay = new Date(arrayAscByTimeWithoutCurrentDay[0].date).toLocaleDateString();
        stat.activeDayWithoutCurrentDay = new Date(arrayAscByTimeWithoutCurrentDay[arrayAscByTimeWithoutCurrentDay.length - 1].date).toLocaleDateString();
        stat.inActiveDayTimeWithoutCurrentDay = arrayAscByTimeWithoutCurrentDay[0].total;
        stat.activeDayTimeWithoutCurrentDay = arrayAscByTimeWithoutCurrentDay[arrayAscByTimeWithoutCurrentDay.length - 1].total;
    }
    else {
        stat.activeDayWithoutCurrentDay = 'No data';
        stat.inActiveDayWithoutCurrentDay = 'No data';
    }

    stat.firstDay = new Date(array[0]).toLocaleDateString();;
    stat.activeDays = array.length;
    stat.averageTime = Math.round(totalTime / array.length);
    stat.totalDays = daysBetween(array[0], array[array.length - 1]);
}