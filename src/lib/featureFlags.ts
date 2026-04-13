export const isHajjIncluded = process.env.NEXT_PUBLIC_HAJJ_INCLUDED === 'true';

export const APP_NAME = isHajjIncluded ? 'Green Hajj & Umrah' : 'Green Umrah';
export const APP_NAME_UPPER = isHajjIncluded ? 'GREEN HAJJ UMRAH' : 'GREEN UMRAH';
export const APP_TEAM_NAME = isHajjIncluded ? 'Tim Green Hajj Umrah' : 'Tim Green Umrah';
