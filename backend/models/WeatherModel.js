// Example model for weather data (expand as needed)
class WeatherModel {
  constructor(data) {
    this.state = data.state;
    this.district = data.district;
    this.forecast = data.forecast;
    this.updatedAt = new Date();
  }
}

module.exports = WeatherModel;
