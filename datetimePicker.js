/* global $:true */
/* jshint unused:false*/

+ function($) {
  "use strict";

/**
 * datetimePicker 日期时间选择器，由picker拓展而来，提供年、月、日、时、分的选择。
 * @param options 配置项
 * @param {string=} [options.id=datePicker] 作为picker的唯一标识
 * @param {number=|string|Date} [options.start=2000] 起始年份，如果是 `Number` 类型，表示起始年份；如果是 `String` 类型，格式为 'YYYY-MM-DD'；如果是 `Date` 类型，就传一个 Date
 * @param {number=|string|Date} [options.end=2030] 结束年份，同上
 * @param {string=} [options.cron=* * *] cron 表达式，三位，分别是 dayOfMonth[1-31]，month[1-12] 和 dayOfWeek[0-6]（周日-周六）
 * @param {string=} [options.className] 自定义类名
 * @param {array=} [options.defaultValue] 默认选项的value数组, 如 [1991, 6, 9]
 * @param {function=} [options.onChange] 在picker选中的值发生变化的时候回调
 * @param {function=} [options.onConfirm] 在点击"确定"之后的回调。回调返回选中的结果(Array)，数组长度依赖于picker的层级。
 *
 *@example
 * // 示例1：
 * weui.datePicker({
 *     start: 1990,
 *     end: 2000,
 *     defaultValue: [1991, 6, 9],
 *     onChange: function(result){
 *         console.log(result);
 *     },
 *     onConfirm: function(result){
 *         console.log(result);
 *     },
 *     id: 'datePicker'
 * });
 *
 * // 示例2：
 * weui.datePicker({
 *      start: new Date(), // 从今天开始
 *      end: 2030,
 *      defaultValue: [2020, 6, 9],
 *      onChange: function(result){
 *          console.log(result);
 *      },
 *      onConfirm: function(result){
 *          console.log(result);
 *      },
 *      id: 'datePicker'
 *  });
 *
 *  // 示例3：
 * weui.datePicker({
 *      start: new Date(), // 从今天开始
 *      end: 2030,
 *      cron: '* * 0,6',  // 每逢周日、周六
 *      onChange: function(result){
 *          console.log(result);
 *      },
 *      onConfirm: function(result){
 *          console.log(result);
 *      },
 *      id: 'datePicker'
 *  });
 *
 *  // 示例4：
 * weui.datePicker({
 *      start: new Date(), // 从今天开始
 *      end: 2030,
 *      cron: '1-10 * *',  // 每月1日-10日
 *      onChange: function(result){
 *          console.log(result);
 *      },
 *      onConfirm: function(result){
 *          console.log(result);
 *      },
 *      id: 'datePicker'
 *  });
 */

const dt_replace_regex = /(-|\s|:)+/g;
const t_regex = /^(\d+)(?:(\d+))?$/g;
const t_constraints = [[0, 59], [0, 23]];

const is_array = function(arr){
    return Object.prototype.toString.call(arr).indexOf('Array') !== -1;
}
const is_date = function(date) {
    return Object.prototype.toString.call(date).indexOf('Date') !== -1;
}
const parse_cron = function(expr, constraints) { //返回多维数组
    let cronArr = expr.split(' ');
    cronArr = cronArr.map(function(d, n) {
        let range = d;
        if (range === '*') {
            // *
            range = constraints[n].join('-')
        }
        range = range.split(',');
        for (let i = 0; i < range.length; i++) {
            let ri = range[i];
            range[i] = [];
            if (ri.indexOf('-') !== -1) {
                // 1,2,5-9
                let se = ri.split('-');
                while (se[0] <= +se[1]) {
                    range[i].push(se[0]++);
                }
            } else if (ri.indexOf('*/') !== -1) {
                // */2,*/3
                let step = ri.substr(ri.indexOf('/') + 1);
                let se = constraints[n].slice(0);
                while (se[0] <= +se[1]) {
                    range[i].push(se[0]);
                    se[0] += +step;
                }
            } else {
                range[i].push(ri);
            }
            range[i] = range[i].join(',')
        }
        range = range.join(',').split(',').map(function(d){return +d})
        return range.sort(function(a, b) {
            return a - b
        })//.join(',');
    })
    return cronArr;
}

// 支持时分设置
function timePicker(options) {
    const nowDate = new Date();

    // 处理defaultValue为Date/String情况
    if(options.defaultValue != null) {
        if(is_date(options.defaultValue)) {
            let defaultValue = options.defaultValue;
            options.defaultValue = [];
            options.defaultValue.push(defaultValue.getHours());
            options.defaultValue.push(defaultValue.getMinutes());
        } else if(typeof options.defaultValue === 'string') {
            options.defaultValue = options.defaultValue.split(':').slice(0, 2);
        }
    }

    const defaults = $.extend({
        id: 'timePicker',
        onChange: $.noop,
        onConfirm: $.noop,
        start: [0, 0],//00:00
        end: [23, 59],//23:59
        defaultValue: [nowDate.getHours(), nowDate.getMinutes()],
        cron: '* *',
    }, options);

    // 兼容原来的 start、end 传 Number 的用法
    if (typeof defaults.start === 'number') {
        defaults.start = [defaults.start, 0];
    }
    else if (typeof defaults.start === 'string') {
        defaults.start = defaults.start.split(':').slice(0, 2);
    }
    if (typeof defaults.end === 'number') {
        defaults.end = [defaults.end, 59];
    }
    else if (typeof defaults.end === 'string') {
        defaults.end = defaults.end.split(':').slice(0, 2);
    }

    // 秒归零
    let refDate = new Date();
    refDate.setSeconds(0);
    refDate.setMilliseconds(0);

    if(is_array(defaults.start)) {
        let start = defaults.start;
        defaults.start = new Date(refDate.getTime());
        defaults.start.setHours(start[0]);
        defaults.start.setMinutes(start[1]);
    }
    if(is_array(defaults.end)) {
        let end = defaults.end;
        defaults.end = new Date(refDate.getTime());
        defaults.end.setHours(end[0]);
        defaults.end.setMinutes(end[1]);
    }
    
    if (defaults.start.getTime() > defaults.end.getTime()) {
        // exchange start/end
        let seTmp = defaults.start;
        defaults.start = defaults.end;
        defaults.end = seTmp;
    }

    const findBy = (array, key, value) => {
        for(let i = 0, len = array.length; i < len; i++){
            const obj = array[i];
            if(obj[key] == value){
                return obj;
            }
        }
    };

    const date  = [];
    let cronArr = parse_cron(defaults.cron, t_constraints);
    let start   = new Date(defaults.start.getTime());
    let end     = new Date(defaults.end.getTime());
    do {
        const hour   = start.getHours();
        const minute = start.getMinutes();

        // 范围判断
        if (cronArr[1].indexOf(hour) === -1) {
            start.setHours(start.getHours() + 1);
            start.setMinutes(0);
            continue;
        } else if (cronArr[0].indexOf(minute) === -1) {
            start.setMinutes(start.getMinutes() + 1);
            continue;
        }

        let H = findBy(date, 'value', hour);
        if (!H) {
            H = {
                label: hour + '时',
                value: hour,
                children: []
            };
            date.push(H);
        }
        let M = findBy(H.children, 'value', minute);
        if (!M) {
            M = {
                label: minute + '分',
                value: minute,
                // children: []
            };
            H.children.push(M);
        }

        // step
        start.setMinutes(start.getMinutes() + 1);

    } while (start <= end);

    return weui.picker(date, defaults);
}

weui.timePicker = timePicker;


weui.__datePicker = weui.datePicker;
function datePicker(options) {
    // 处理defaultValue为Date/String情况
    if(options.defaultValue != null) {
        if(is_date(options.defaultValue)) {
            let defaultValue = options.defaultValue;
            options.defaultValue = [];
            options.defaultValue.push(defaultValue.getFullYear());
            options.defaultValue.push(defaultValue.getMonth()+1);
            options.defaultValue.push(defaultValue.getDate());
        } else if(typeof options.defaultValue === 'string') {
            options.defaultValue = options.defaultValue.replace(dt_replace_regex,' ').split(' ').slice(0, 3);
        }
    }

    return weui.__datePicker(options);
}
weui.datePicker = datePicker;

const regex = /^(\d+)(?:-(\d+))?(?:\/(\d+))?$/g;
const constraints = [[1, 31], [1, 12], [1910, 2050]];

function datetimePicker(options) {
    const nowDate = new Date();

    // 处理defaultValue为Date/String情况
    if(options.defaultValue != null) {
        if(is_date(options.defaultValue)) {
            let defaultValue = options.defaultValue;
            options.defaultValue = [];
            options.defaultValue.push(defaultValue.getFullYear());
            options.defaultValue.push(defaultValue.getMonth()+1);
            options.defaultValue.push(defaultValue.getDate());
            options.defaultValue.push(defaultValue.getHours());
            options.defaultValue.push(defaultValue.getMinutes());
        } else if(typeof options.defaultValue === 'string') {
            options.defaultValue = options.defaultValue.replace(dt_replace_regex,' ').split(' ').slice(0, 5);
        }
    }

    const defaults = $.extend({
        id: 'datetimePicker',
        onChange: $.noop,
        onConfirm: $.noop,
        start: nowDate.getFullYear() - 20,
        end: nowDate.getFullYear() + 20,
        // time: {
        //     start: [0, 0],//00:00
        //     end: [23, 59],//23:59
        // },
        defaultValue: [nowDate.getFullYear(), nowDate.getMonth() + 1, nowDate.getDate(), nowDate.getHours(), nowDate.getMinutes()],
        cron: '* * *'//5层的话数据量太大，只处理3层，追加时分
    }, options);

    // 兼容原来的 start、end 传 Number 的用法
    if (typeof defaults.start === 'number') {
        defaults.start = new Date(`${defaults.start}/01/01`);
    }
    else if (typeof defaults.start === 'string') {
        defaults.start = new Date(defaults.start.replace(/-/g, '/'));
    }
    if (typeof defaults.end === 'number') {
        defaults.end = new Date(`${defaults.end}/12/31`);
    }
    else if (typeof defaults.end === 'string') {
        defaults.end = new Date(defaults.end.replace(/-/g, '/'));
    }

    const findBy = (array, key, value) => {
        for(let i = 0, len = array.length; i < len; i++){
            const obj = array[i];
            if(obj[key] == value){
                return obj;
            }
        }
    };

    let time = [];
    for(let hour=t_constraints[1][0];hour<=t_constraints[1][1];hour++) {
        let H = {
            label: hour + '时',
            value: hour,
            children: []
        };
        time.push(H);

        for(let minute=t_constraints[0][0];minute<=t_constraints[0][1];minute++) {
            let M = {
                label: minute + '分',
                value: minute
            };
            H.children.push(M);
        }
    }

    const date  = [];
    let cronArr = parse_cron(defaults.cron, constraints);
    let start   = new Date(defaults.start.getTime());
    let end     = new Date(defaults.end.getTime());
    do {
        const year = start.getFullYear();
        const month = start.getMonth() + 1;
        const day = start.getDate();

        // 范围判断
        if (cronArr[2].indexOf(year) === -1) {
            start.setFullYear(start.getFullYear() + 1);
            start.setMonth(0);
            start.setDate(1);
            continue;
        } else if (cronArr[1].indexOf(month) === -1) {
            start.setMonth(start.getMonth() + 1);
            start.setDate(1);
            continue;
        } else if (cronArr[0].indexOf(day) === -1) {
            start.setDate(start.getDate() + 1);
            continue;
        }

        let Y = findBy(date, 'value', year);
        if (!Y) {
            Y = {
                label: year + '年',
                value: year,
                children: []
            };
            date.push(Y);
        }
        let M = findBy(Y.children, 'value', month);
        if (!M) {
            M = {
                label: month + '月',
                value: month,
                children: []
            };
            Y.children.push(M);
        }
        let D = findBy(M.children, 'value', day);
        if (!D) {
            D = {
                label: day + '日',
                value: day,
                children: time
            };
            M.children.push(D);
        }

        start.setDate(start.getDate() + 1);
    }
    while (start <= end);

    return weui.picker(date, defaults);
}

weui.datetimePicker = datetimePicker;

}($);
