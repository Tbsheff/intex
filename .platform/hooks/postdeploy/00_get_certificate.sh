#!/usr/bin/env bash
# Place in .platform/hooks/postdeploy directory
sudo certbot -n -d socialsense.is404.net --nginx --agree-tos --email tbsheff@byu.edu
