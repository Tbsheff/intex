#!/usr/bin/env bash
# Place in .platform/hooks/postdeploy directory
sudo certbot -n -d socialsense.is404.net --nginx --agree-tos --email tbsheff@byu.edu
sudo certbot -n -d sensesocial.is404.net --nginx --agree-tos --email tbsheff@byu.edu
sudo certbot -n -d intex2-11.is404.net --nginx --agree-tos --email tbsheff@byu.edu