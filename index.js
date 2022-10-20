require('dotenv').config();
const axios = require('axios');
const dayjs = require('dayjs');

// Parse Date
dateStr = null
if (process.argv.length > 2) {
    dateStr = process.argv[2];
    // validate date string
    dateReg = /^\d{4}-\d{2}-\d{2}$/
    if (!dateReg.test(dateStr)) {
        console.log('invalid date');
        process.exit(0);
    }
}
let date  = getParsedDate(dateStr);

// 建立 Journal 資料
createJournal(date)
    .then(res => {
        const JOURNAL_ID = res.data.id;
        // 建立 timelog 資料：每日 07:00 - 24:00 （半小時一個）
        let hour = 7;
        while (hour < 24) {
            minute = (hour - Math.floor(hour)) * 60;
            start = date.hour(Math.floor(hour)).minute(minute);
            end = start.add(30, 'minute');
            createTimeLog(JOURNAL_ID, start, end);
            hour += 0.5;
        }
    });


function getParsedDate(date) {
    date = date ? dayjs(date) : dayjs();
    return date.hour(0).minute(0).second(0).millisecond(0);
}

function createJournal(date) {
    return createNotionPage(process.env.JOURNAL_DB_ID, {
        "Name": {
            "title": [{
                "text": {
                    "content": date.format('YYYY MMM DD')
                }
            }]
        },
        "Date": {
            "date": {
                "start": date.format('YYYY-MM-DD'),
            }
        }
    }).then(res => {
        return res
    });
}


function createTimeLog(journalId, start, end) {
    const HOUR_FORMAT = 'HH:mm';
    const DATE_FORMAT = 'YYYY-MM-DDTHH:mm:ssZ';
    createNotionPage(process.env.TIMELOG_DB_ID, {
        "Name": {
            "title": [{
                "text": {
                    "content": start.format(HOUR_FORMAT) + '-' + end.format(HOUR_FORMAT)
                }
            }]
        },
        "Date": {
            "date": {
                "start": start.format(DATE_FORMAT),
                "end": end.format(DATE_FORMAT),
            }
        },
        "Journal": {
            "relation": [
                {
                    "id": journalId
                }
            ],
        },
    });
}

// create notion DB page
function createNotionPage(databaseId, properties, success) {
    return axios.post('https://api.notion.com/v1/pages', {
            "parent": {
                "database_id": databaseId
            },
            "properties": properties,
        }, {
            headers: {
                Authorization: `Bearer ${process.env.NOTION_KEY}`,
                "Notion-Version": process.env.NOTION_VERSION
            }
        })
        .then((res) => {
            return res
        })
        .catch(err => console.log(err.response.data));
}