import express from "express";
import {CustomResponseBody} from "./PlanningsRouter/types";

export type ApiResponse<Returned = null> = express.Response<CustomResponseBody<Returned>>