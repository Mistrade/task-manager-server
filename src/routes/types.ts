import express from "express";
import {CustomResponseBody} from "./PlanningsRouter";

export type ApiResponse<Returned = null> = express.Response<CustomResponseBody<Returned>>