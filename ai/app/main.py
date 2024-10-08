import logging
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.httpsredirect import HTTPSRedirectMiddleware
from .dependencies.auth import ShepherdHeaderMiddleware
from .routers import conversations, solve
from .db.database import create_db_and_tables
from dotenv import load_dotenv, find_dotenv

load_dotenv(find_dotenv()) 

app = FastAPI()


origins = [
   "https://dev--shepherd-tutors.netlify.app",
   "http://localhost:3000",
   "http://localhost:3001",
   "https://deploy-preview-839--shepherd-tutors.netlify.app",
   "https://deploy-preview-*.shepherd-tutors.netlify.app",
   "https://deploy-preview-*--keen-phoenix-727261.netlify.app"
]

# app.add_middleware(HTTPSRedirectMiddleware)

app.add_middleware(ShepherdHeaderMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(conversations.router)
app.include_router(solve.router)
@app.on_event("startup")
def on_startup():
    create_db_and_tables()
 
# @app.exception_handler(RequestValidationError)
# async def validation_exception_handler(request: Request, exc: RequestValidationError):
# 	exc_str = f'{exc}'.replace('\n', ' ').replace('   ', ' ')
# 	logging.error(f"{request}: {exc_str}")
# 	content = {'status_code': 10422, 'message': exc_str, 'data': None}
# 	return JSONResponse(content=content, status_code=status.HTTP_422_UNPROCESSABLE_ENTITY)
 
@app.get("/")
async def root():
    return {"message": "Hello World"}