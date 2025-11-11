from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Literal
import py_vollib.black_scholes as bs
import py_vollib.black_scholes.greeks.analytical as greeks
from datetime import datetime, date
import math

app = FastAPI(title="Greeks Service", version="0.1.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your Next.js domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class GreeksRequest(BaseModel):
    underlying_price: float = Field(gt=0, description="Current price of the underlying")
    strike: float = Field(gt=0, description="Strike price")
    expiration: date = Field(description="Expiration date (YYYY-MM-DD)")
    option_type: Literal["call", "put"] = Field(description="Option type")
    volatility: float = Field(gt=0, lt=10, description="Implied volatility (as decimal, e.g., 0.25 for 25%)")
    risk_free_rate: float = Field(default=0.05, description="Risk-free rate (as decimal)")


class GreeksResponse(BaseModel):
    price: float
    delta: float
    gamma: float
    theta: float
    vega: float
    rho: float
    time_to_expiry_days: int


def calculate_time_to_expiry(expiration_date: date) -> float:
    """Calculate time to expiry in years."""
    today = date.today()
    days_to_expiry = (expiration_date - today).days

    if days_to_expiry < 0:
        raise ValueError("Expiration date must be in the future")

    # Convert to years (using 365 days per year)
    return days_to_expiry / 365.0


@app.get("/")
def read_root():
    return {
        "service": "Greeks Calculation Service",
        "status": "healthy",
        "version": "0.1.0"
    }


@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.post("/calculate", response_model=GreeksResponse)
def calculate_greeks(request: GreeksRequest):
    """
    Calculate option price and Greeks using Black-Scholes model.
    """
    try:
        # Calculate time to expiry
        time_to_expiry = calculate_time_to_expiry(request.expiration)
        days_to_expiry = (request.expiration - date.today()).days

        if time_to_expiry <= 0:
            raise HTTPException(
                status_code=400,
                detail="Option has expired or expires today"
            )

        # Calculate option price
        price = bs.black_scholes(
            flag=request.option_type[0],  # 'c' or 'p'
            S=request.underlying_price,
            K=request.strike,
            t=time_to_expiry,
            r=request.risk_free_rate,
            sigma=request.volatility
        )

        # Calculate Greeks
        delta = greeks.delta(
            flag=request.option_type[0],
            S=request.underlying_price,
            K=request.strike,
            t=time_to_expiry,
            r=request.risk_free_rate,
            sigma=request.volatility
        )

        gamma_val = greeks.gamma(
            flag=request.option_type[0],
            S=request.underlying_price,
            K=request.strike,
            t=time_to_expiry,
            r=request.risk_free_rate,
            sigma=request.volatility
        )

        theta_val = greeks.theta(
            flag=request.option_type[0],
            S=request.underlying_price,
            K=request.strike,
            t=time_to_expiry,
            r=request.risk_free_rate,
            sigma=request.volatility
        )

        vega_val = greeks.vega(
            flag=request.option_type[0],
            S=request.underlying_price,
            K=request.strike,
            t=time_to_expiry,
            r=request.risk_free_rate,
            sigma=request.volatility
        )

        rho_val = greeks.rho(
            flag=request.option_type[0],
            S=request.underlying_price,
            K=request.strike,
            t=time_to_expiry,
            r=request.risk_free_rate,
            sigma=request.volatility
        )

        return GreeksResponse(
            price=round(price, 4),
            delta=round(delta, 4),
            gamma=round(gamma_val, 4),
            theta=round(theta_val, 4),
            vega=round(vega_val, 4),
            rho=round(rho_val, 4),
            time_to_expiry_days=days_to_expiry
        )

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Calculation error: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
