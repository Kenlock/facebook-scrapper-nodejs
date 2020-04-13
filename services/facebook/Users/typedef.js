/**
 * @typedef WorkDetails
 * @property {sring} position
 * @property {sring} company
 * @property {sring} company_url
 * @property {sring} city
 * @property {sring} state
 * @property {sring} description
 * @property {boolean} current
 * @property {number} start_day
 * @property {number} start_month
 * @property {number} start_year
 * @property {number} end_day
 * @property {number} end_month
 * @property {number} end_year
 */

/**
 * @typedef LivedAtPlaceDetails
 * @property {boolean} current
 * @property {boolean} home_town
 * @property {sring} city
 * @property {sring} state
 * @property {sring} link_to_place
 * @property {Date} moved_in_year
 * @property {sring} time_period_end
 */

/**
 * @typedef ContactInfo
 * @property {"phone"|"address"|"email"|"social"|"website"} type
 * @property {sring} value
 */


/**
 * @typedef RelationShipInfo
 * @property {string} relationship
 * @property {string} to
 * @property {string} to_user_url
 * @property {string} since_day
 * @property {string} since_month
 * @property {string} since_year
 * @property {string} full_text
 */

/**
* @typedef FamiliyMemberInfo
* @property {string} relationship
* @property {string} to_user_id
*/

/**
 * @typedef EducationInfo
 * @property {string} school
 * @property {string} school_url
 * @property {string} time_period_start
 * @property {string} time_period_end
 * @property {string[]} concentrations
 * @property {string} attended_for
 *
 */

/**
 * @typedef LifeEvent
 * @property {string} description
 * @property {string} year
 * @property {string} url
 */

 /**
 * @typedef BasicInfo
 * @property {string} gender
 * @property {string} about
 * @property {number} birthDay
 * @property {number} birthMonth
 * @property {number} birthYear
 * @property {string[]} languages
 * @property {string[]} insterested_in
 * @property {string} religious_views
 * @property {string} political_views
 */

 /**
  * @typedef OtherName
  * @property {string} type
  * @property {string} name
  */

/**
 * @typedef UserData
 * @property {string} id
 * @property {string} name
 * @property {string} about
 * @property {OtherName[]} other_names
 * @property {BasicInfo} basic_info
 * @property {RelationShipInfo} relationship_info
 * @property {FamiliyMemberInfo[]} family_info
 * @property {LivedAtPlaceDetails[]} lived_at
 * @property {LivedAtPlaceDetails[]} life_events
 * @property {EducationInfo[]} education
 * @property {LifeEvent[]} live_events
 * @property {WorkDetails[]} worked_at
 * @property {ContactInfo[]} contact_info
 */