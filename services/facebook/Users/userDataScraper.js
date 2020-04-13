'using strict'
'using strict'
const authentication = require("../../../utils/authentication");
const serviceConfiguration = require("../configuration.json");
const serviceName = serviceConfiguration.name;
const errors = require("../errors");
const logger = require("../../../utils/Logger");
const common = require("../common")
const cheerio = require('cheerio')

const matchFirst = require("../../../utils/utils").matchFirst;
String.prototype.matchFirst = function (regex) { return matchFirst(this, regex) };

const informationEnum = {
    WORK: "Work",
    EDUCATION: "Education",
    PLACES_LIVED: "Places",
    CONTACT_INFO: "Contact",
    BASIC_INFO: "Basic",
    OTHER_NAMES: "Other Names",
    RELATIONSHIP: "Relationship",
    LIVE_EVENT: "Life Events",
    FAMILY_MEMBERS: "Family",
    ABOUT: "About"
}

function selectInformationElements($, informationSelector) {
    const information = $(`table:contains(${informationSelector})`).parent().siblings().find(">div")
    if (information.length > 0) {
        return information;
    }
    return false;
}

function scrapeEducationData($) {
    const dataElements = selectInformationElements($, informationEnum.EDUCATION);
    /** @type {EducationInfo} */
    if (dataElements) {
        let education_info_array = [];
        dataElements.toArray().forEach(dataElement => {
            let educationInfo = {};
            const educationDataElement = $(dataElement).children().children()[1];
            const workData = $(educationDataElement).find("span");
            educationInfo.school_url = $(educationDataElement).find("a")[0].attribs.href
            workData.toArray().forEach((span, index) => {
                const spanText = $(span).text();
                if (index === 0) {
                    educationInfo.school = spanText;
                }
                else if (index > 3) {
                    //ignore this is a description
                    return;
                }
                else {
                    if (spanText.matchFirst(/\d+/)) {
                        if (spanText.match("-")) {
                            let startEnd = spanText.split("-");
                            educationInfo.time_period_start = startEnd[0].replace(/\s/g, '');
                            educationInfo.time_period_end = startEnd[1].replace(/\s/g, '');
                        } else {
                            educationInfo.time_period_end = spanText.matchFirst(/\d+/);
                        }
                    } else {
                        if (spanText.match("College|High")) {
                            educationInfo.attended_for = spanText;
                        } else {
                            educationInfo.attended_for = spanText.replace(/\s/g, '').split('·');
                        }

                    }
                }
            })
            education_info_array.push(educationInfo);
        })
        return education_info_array;
    }
    return [];
}

function scrapeBasicInfoData($) {
    const basic_info_elements = selectInformationElements($, informationEnum.BASIC_INFO);
    if (basic_info_elements) {
        /** @type {BasicInfo} */
        let basic_info = {};
        basic_info_elements.toArray().forEach(el => {
            const data = $(el).find("td");
            if (data) {
                const label = $(data[0]).text();
                const value = $(data[1]).text();
                switch (label) {
                    case "Birthday":
                        let birthday = value.replace(',', '').split(" ");
                        basic_info.birthMonth = common.getMonth(birthday[0]);
                        if (birthday[1])
                            basic_info.birthDay = +birthday[1];
                        if (birthday[2])
                            basic_info.birthYear = +birthday[2];
                        break;
                    case "Gender":
                        basic_info.gender = value;
                        break;
                    case "Languages":
                        basic_info.languages = value.split(/,|and/).map(e => e.trim());
                        break;
                    case "Interested In":
                        basic_info.insterested_in = value.split("and").map(e => e.trim());
                        break;
                    case "Religious Views":
                        //todo: scrape the url too
                        basic_info.religious_views = value;
                        break;
                    case "Political Views":
                        //todo: scrape the url too    
                        basic_info.political_views = value;
                        break;

                }
            }
        })
        return basic_info;
    }
    return {};
}

function scrapePlacesLivedData($) {
    const places_lived_elements = selectInformationElements($, informationEnum.PLACES_LIVED);
    let lived_at_places = [];
    if (places_lived_elements) {
        /** @type {BasicInfo} */
        places_lived_elements.toArray().forEach(el => {
            const data = $(el).find("td");
            if (data) {
                /** @type {LivedAtPlaceDetails} */
                let lived_at_places_data = {};
                const moved_in_element = $(data[0]);
                const place_element = $(data[1]);

                const moved_in_label = moved_in_element.text();
                const place_label = place_element.text();
                const place_url = place_element.find("a")[0].attribs.href
                let place_city_state = place_label.split(",").map(e => e.trim())

                lived_at_places.link_to_place = place_url;
                lived_at_places_data.city = place_city_state[0];
                if (place_city_state.length > 1) {
                    lived_at_places_data.state = place_city_state[1];
                }
                if (moved_in_label.matchFirst(/Current/)) {
                    lived_at_places_data.current = true;

                } else if (moved_in_label.matchFirst(/Home/)) {
                    lived_at_places_data.home_town = true;
                } else {
                    const moved_in_url = moved_in_element.find("a")[0].attribs.href
                    const moved_in_year = moved_in_label.matchFirst(/\d{4}/)
                    lived_at_places_data.moved_in_year = moved_in_year;
                    lived_at_places_data.moved_in_url = moved_in_url;
                }
                lived_at_places.push(lived_at_places_data);
            }
        })
        return lived_at_places;
    }
    return lived_at_places;
}

function scrapeRelationshipData($) {
    const relationship_information = selectInformationElements($, informationEnum.RELATIONSHIP);
    let relationship_data = {};
    if (relationship_information.length > 0) {
        const relationship_with_element = $(relationship_information).find("a");
        if (relationship_with_element.length > 0) {
            relationship_data.to = relationship_with_element.text();
            relationship_data.to_user_url = relationship_with_element[0].attribs.href;
        }
        const relationship_info_text = relationship_information.text();
        relationship_data.full_text = relationship_info_text;
        let since_date = relationship_info_text.matchFirst(/(?<=since)(.*?)(?=$)/);
        if (since_date) {
            since_date = since_date.trim();
        }
        if (since_date) {
            let since = since_date.replace(',', '').split(" ");
            relationship_data.since_month = common.getMonth(since[0]);
            if (since[1])
                relationship_data.since_day = +since[1];
            if (since[2])
                relationship_data.since_year = +since[2];
        }
        const relationship = relationship_info_text.matchFirst(/(.*?)(?=to|with|$)/).trim()
        if (relationship) {
            relationship_data.relationship = relationship;
        }
    }
    return relationship_data;
}

function scrapedContactData($) {
    const contact_info_elements = selectInformationElements($, informationEnum.CONTACT_INFO);
    let contact_info = [];
    if (contact_info_elements) {
        /** @type {BasicInfo} */
        contact_info_elements.toArray().forEach(el => {
            const data = $(el).find("td");
            if (data) {
                /** @type {LivedAtPlaceDetails} */
                let contact_info_data = {};
                const contact_type = $(data[0]).text();
                const value = $(data[1]).text();
                contact_info_data.type = contact_type;
                contact_info_data.value = value;
                contact_info.push(contact_info_data);
            }
        })
        return contact_info;
    }
    return contact_info;

}

function scrapeLifeEventsData($) {
    const life_event_elements = selectInformationElements($, informationEnum.LIVE_EVENT);
    let life_events = [];
    if (life_event_elements.length > 0) {
        $(life_event_elements).find(">div>div").toArray().forEach(e => {
            let year = 0;
            $(e).find(">div").toArray().forEach((e, i) => {
                if (i === 0) {
                    //year
                    year = $(e).text();
                } else {
                    let description = $(e).text();
                    let url = $(e).find('a')[0].attribs.href;
                    let life_event = {
                        year: year,
                        url: url,
                        description: description
                    }
                    life_events.push(life_event);
                }
            });
        });
    }
    return life_events;
}

function scrapeWorkData($) {
    const dataElements = selectInformationElements($, informationEnum.WORK);
    /** @type {EducationInfo} */
    let work_info_array = [];
    if (dataElements) {
        dataElements.toArray().forEach(dataElement => {
            let workInfo = {};
            const workDataElement = $(dataElement).children().children()[1];
            const workData = $(workDataElement).find("span");
            workInfo.company_url = $(workDataElement).find("a")[0].attribs.href
            workData.toArray().forEach((span, index) => {
                const spanText = $(span).text();
                if (index === 0) {
                }
                else if (index > 3) {
                    workInfo.description = spanText;
                }
                else {
                    if (spanText.matchFirst(/\d{2}/)) {
                        let startEnd = spanText.split("-").map(e => e.trim());
                        if (startEnd.length > 1) {
                            if (!startEnd[1].toLowerCase().match(/present/)) {
                                const endDateSplit = startEnd[1].replace(/,/g, '').split(" ");
                                switch (endDateSplit.length) {
                                    case 3:
                                        workInfo.end_year = +endDateSplit[2];
                                    case 2:
                                        workInfo.end_day = +endDateSplit[1];
                                    case 1:
                                        workInfo.end_month = common.getMonth(endDateSplit[0]);
                                }
                            } else {
                                workInfo.current = true;
                            }
                        }
                        const startDateSplit = startEnd[0].replace(/,/g, '').split(" ");
                        switch (startDateSplit.length) {
                            case 3:
                                workInfo.start_year = +startDateSplit[2];
                            case 2:
                                workInfo.start_day = +startDateSplit[1];
                            case 1:
                                workInfo.start_month = common.getMonth(startDateSplit[0]);
                        }
                    } else if (spanText.match(",")) {
                        const cityState = spanText.split(",").map(e => e.trim());
                        workInfo.city = cityState[0];
                        workInfo.state = cityState[1];
                    }
                    else {
                        workInfo.position = spanText.trim();
                    }
                }
            })
            work_info_array.push(workInfo);
        });
    }
    return work_info_array;
}

function scrapeFamilyData($) {
    const familyElements = selectInformationElements($, informationEnum.FAMILY_MEMBERS);
    /** @type {EducationInfo} */
    let family_members_array = [];
    if (familyElements) {
        familyElements.toArray().forEach(familyElement => {
            let family_member_info = {};
            const data = $(familyElement).find("div h3");
            const relationship = $(data[1]).text();
            const to_user_id = $(data[0]).find("a")[0].attribs.href;
            family_member_info.relationship = relationship;
            family_member_info.to_user_id = to_user_id;
            family_members_array.push(family_member_info);
        });
    }
    return family_members_array;

}

function scrapeOtherNamesData($) {
    const other_names_elements = selectInformationElements($, informationEnum.OTHER_NAMES);
    let other_names = [];
    if (other_names_elements) {
        /** @type {BasicInfo} */
        let other_names_info = {};
        other_names_elements.toArray().forEach(el => {
            const data = $(el).find("td");
            if (data) {
                const label = $(data[0]).text();
                const value = $(data[1]).text();
                let other_name = {
                    type: label,
                    name: value
                }
                other_names.push(other_name);
            }
        })
    }
    return other_names;


}

function scrapeAboutData($){
    const about_element = selectInformationElements($, informationEnum.ABOUT);
    if(about_element.length > 0){
        return about_element.text();
    }
    return "";
}

/**
 * 
 * @param {string} user_id 
 * @param {string} username 
 */
async function scrapeUserDataAsync(user_id, username) {
    let userProfilePath = `${user_id}`;
    try {
        const landingGetUrl = `${serviceConfiguration.baseMobileURL}/${userProfilePath}`;

        const credentials = authentication.keychain.getCredentials(serviceName, username);
        const cookie = await common.loginAsync(credentials.username, credentials.password);

        const agent = common.getAgent(cookie);
        const landingResponse = await agent.get(landingGetUrl)
        const landingHtmlBody = landingResponse.body.toString();
        let $ = cheerio.load(landingHtmlBody);
        const aboutEl = $("a[href*=about]");
        if(aboutEl.length > 0){
            const aboutPath = aboutEl.last()[0].attribs.href;
            const getUrl = `${serviceConfiguration.baseMobileURL}${aboutPath}`;
            const response = await agent.get(getUrl)
            const htmlBody = response.body.toString();
            $ = cheerio.load(htmlBody);
        }
        const name = $("strong").last().text()
        const education_info = scrapeEducationData($);
        const basic_info = scrapeBasicInfoData($);
        const lived_at = scrapePlacesLivedData($);
        const contact_info = scrapedContactData($);
        const relationship_info = scrapeRelationshipData($);
        const life_events = scrapeLifeEventsData($);
        const work_info = scrapeWorkData($);
        const family_info = scrapeFamilyData($);
        const other_names = scrapeOtherNamesData($);
        const about = scrapeAboutData($);

        /** @type {UserData} */
        const user_data = {
            id: user_id,
            name: name,
            other_names: other_names,
            basic_info: basic_info,
            relationship_info: relationship_info,
            family_info: family_info,
            lived_at: lived_at,
            education: education_info,
            life_events: life_events,
            worked_at: work_info,
            contact_info: contact_info,
            about: about
        }
        return user_data;
    } catch (e) {
        if (e.status >= 400) {
            logger.error("Not found", getUrl);
        }else{
            logger.critical("another error", e, user_id, userProfilePath);
        }
    }

}

module.exports = scrapeUserDataAsync;