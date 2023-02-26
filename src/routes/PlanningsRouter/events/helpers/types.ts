import {EventInviteAccessRights} from "../../../../mongo/models/EventInvite";

export type RootsFilterType = 'any' | EventAccessRightsWithCreator
export type EventAccessRightsWithCreator = EventInviteAccessRights | 'creator'